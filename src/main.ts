import './style.css';
import * as Cesium from 'cesium';
import { createViewer, flyToLocation, flyToCinematic, initGoogle3DTiles, toggleGoogle3D } from './globe/viewer';
import { FlightTracker } from './flights/tracker';
import { SatelliteRenderer } from './satellites/renderer';
import { FilterManager, FilterMode } from './filters/manager';
import { EarthquakeLayer } from './osint/earthquakes';
import { HUD } from './ui/hud';
import { DetailPanel } from './ui/panel';
import { Controls, LOCATION_PRESETS, LocationPreset } from './ui/controls';
import { TrafficParticles } from './traffic/particles';
import { CCTVLayer } from './cctv/feeds';
import { EffectsPanel } from './ui/effects';

// Boot sequence
console.log(
  '%c WORLDVIEW %c Geospatial Command Center ',
  'background:#00ff88;color:#000;font-weight:bold;padding:4px 8px;',
  'background:#0a0a0f;color:#00ff88;padding:4px 8px;border:1px solid #00ff88;'
);

// Initialize Cesium Viewer
const viewer = createViewer();

// Initialize systems
const flightTracker = new FlightTracker(viewer);
const satRenderer = new SatelliteRenderer(viewer);
const filterManager = new FilterManager(viewer);
const earthquakeLayer = new EarthquakeLayer(viewer);
const trafficParticles = new TrafficParticles(viewer);
const cctvLayer = new CCTVLayer(viewer);
const hud = new HUD(viewer);
const detailPanel = new DetailPanel();
const effectsPanel = new EffectsPanel();

// Wire up callbacks
flightTracker.setOnCountUpdate((count) => hud.updateFlightCount(count));
flightTracker.setOnMilitaryCountUpdate((count) => hud.updateMilitaryCount(count));
satRenderer.setOnCountUpdate((count) => hud.updateSatCount(count));
filterManager.setOnChange((mode) => {
  hud.updateFilter(mode);
  effectsPanel.setFilter(mode);
});

// Wire effects panel slider changes to filter manager
effectsPanel.setOnParamChange((_filter, params) => {
  filterManager.updateParams(params);
});

flightTracker.setOnSelect((flight) => {
  if (flight) detailPanel.showFlight(flight);
  else detailPanel.hide();
});

satRenderer.setOnSelect((sat) => {
  if (sat) detailPanel.showSatellite(sat);
  else detailPanel.hide();
});

earthquakeLayer.setOnSelect((eq) => {
  if (eq) detailPanel.showEarthquake(eq);
  else detailPanel.hide();
});

detailPanel.setOnClose(() => {
  flightTracker.selectByIcao(null);
  satRenderer.selectByNoradId(null);
});

// Navigate to location preset
function navigateToPreset(preset: LocationPreset) {
  flyToCinematic(viewer, preset.lon, preset.lat, preset.alt, 2);
  controls.showToast(`NAVIGATING → ${preset.label.toUpperCase()}`);
}

// Controls
const controls = new Controls({
  onFilterChange: (mode: FilterMode) => {
    filterManager.setFilter(mode);
    controls.setActiveFilter(mode);
    effectsPanel.setFilter(mode);
  },
  onToggleFlights: () => {
    flightTracker.toggle();
    controls.setLayerState('flights', flightTracker.visible);
  },
  onToggleSatellites: () => {
    satRenderer.toggle();
    controls.setLayerState('satellites', satRenderer.visible);
  },
  onToggleEarthquakes: () => {
    earthquakeLayer.toggle();
    controls.setLayerState('earthquakes', earthquakeLayer.visible);
  },
  onToggleTraffic: () => {
    trafficParticles.toggle();
    controls.setLayerState('traffic', trafficParticles.visible);
  },
  onToggleMilitary: () => {
    flightTracker.toggleMilitary();
    controls.setLayerState('military', flightTracker.militaryMode);
  },
  onToggleCCTV: () => {
    cctvLayer.toggle();
    controls.setLayerState('cctv', cctvLayer.visible);
  },
  onToggleHUD: () => {
    hud.toggle();
  },
  onSearch: (query: string) => {
    handleSearch(query);
  },
  onLocationSelect: (preset: LocationPreset) => {
    navigateToPreset(preset);
  },
  onToggle3D: () => {
    const enabled = toggleGoogle3D(viewer);
    controls.setTileMode(enabled);
    controls.showToast(enabled ? 'GOOGLE 3D TILES' : 'STANDARD VIEW');
  },
});

// Entity picking
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
  const picked = viewer.scene.pick(click.position);
  if (picked) {
    if (flightTracker.handlePick(picked)) return;
    if (satRenderer.handlePick(picked)) return;
    if (earthquakeLayer.handlePick(picked)) return;
    if (cctvLayer.handlePick(picked)) return;
  }
  // Clicked empty space — deselect
  detailPanel.hide();
  flightTracker.selectByIcao(null);
  satRenderer.selectByNoradId(null);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't capture if input is focused
  if (document.activeElement?.tagName === 'INPUT') return;

  switch (e.key) {
    case '1':
      filterManager.setByIndex(0);
      controls.setActiveFilter('normal');
      effectsPanel.setFilter('normal');
      break;
    case '2':
      filterManager.setByIndex(1);
      controls.setActiveFilter('nightvision');
      effectsPanel.setFilter('nightvision');
      break;
    case '3':
      filterManager.setByIndex(2);
      controls.setActiveFilter('flir');
      effectsPanel.setFilter('flir');
      break;
    case '4':
      filterManager.setByIndex(3);
      controls.setActiveFilter('crt');
      effectsPanel.setFilter('crt');
      break;
    case '5':
      filterManager.setByIndex(4);
      controls.setActiveFilter('enhanced');
      effectsPanel.setFilter('enhanced');
      break;
    case 'c':
    case 'C':
      cctvLayer.toggle();
      controls.setLayerState('cctv', cctvLayer.visible);
      break;
    case 'f':
    case 'F':
      flightTracker.toggle();
      controls.setLayerState('flights', flightTracker.visible);
      break;
    case 's':
    case 'S':
      satRenderer.toggle();
      controls.setLayerState('satellites', satRenderer.visible);
      break;
    case 'g':
    case 'G':
      earthquakeLayer.toggle();
      controls.setLayerState('earthquakes', earthquakeLayer.visible);
      break;
    case 't':
    case 'T':
      trafficParticles.toggle();
      controls.setLayerState('traffic', trafficParticles.visible);
      break;
    case 'm':
    case 'M':
      flightTracker.toggleMilitary();
      controls.setLayerState('military', flightTracker.militaryMode);
      break;
    case 'h':
    case 'H':
      hud.toggle();
      break;
    // Location presets
    case 'q': case 'Q':
    case 'w': case 'W':
    case 'e': case 'E':
    case 'r': case 'R':
    case 'o': case 'O':
    case 'y': case 'Y':
    case 'u': case 'U':
    case 'i': case 'I': {
      const preset = LOCATION_PRESETS.find((p) => p.key === e.key.toUpperCase());
      if (preset) navigateToPreset(preset);
      break;
    }
    case '/':
      e.preventDefault();
      (window as any).__searchInput?.focus();
      break;
    case 'Escape':
      detailPanel.hide();
      flightTracker.selectByIcao(null);
      satRenderer.selectByNoradId(null);
      cctvLayer.closeFeedPanel();
      break;
  }
});

// Search handler
function handleSearch(query: string) {
  const q = query.trim();
  if (!q) return;

  // Try lat,lon parsing
  const latLon = q.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (latLon) {
    const lat = parseFloat(latLon[1]);
    const lon = parseFloat(latLon[2]);
    flyToLocation(viewer, lon, lat, 500000);
    return;
  }

  // Known locations
  const locations: Record<string, [number, number]> = {
    'washington': [-77.0369, 38.9072],
    'dc': [-77.0369, 38.9072],
    'new york': [-74.006, 40.7128],
    'nyc': [-74.006, 40.7128],
    'london': [-0.1276, 51.5074],
    'paris': [2.3522, 48.8566],
    'tokyo': [139.6917, 35.6895],
    'moscow': [37.6173, 55.7558],
    'beijing': [116.4074, 39.9042],
    'sydney': [151.2093, -33.8688],
    'los angeles': [-118.2437, 34.0522],
    'la': [-118.2437, 34.0522],
    'chicago': [-87.6298, 41.8781],
    'dubai': [55.2708, 25.2048],
    'singapore': [103.8198, 1.3521],
    'mumbai': [72.8777, 19.076],
    'cairo': [31.2357, 30.0444],
    'berlin': [13.405, 52.52],
    'rome': [12.4964, 41.9028],
    'seoul': [126.978, 37.5665],
    'toronto': [-79.3832, 43.6532],
    'cape town': [18.4241, -33.9249],
    'rio': [-43.1729, -22.9068],
    'pentagon': [-77.0558, 38.871],
    'area 51': [-115.8111, 37.2431],
    'langley': [-76.4813, 37.0846],
    'kremlin': [37.6176, 55.7518],
    'pyongyang': [125.7625, 39.0392],
    'tehran': [51.389, 35.6892],
    'iss': [0, 0], // placeholder
  };

  const key = q.toLowerCase();
  const match = Object.entries(locations).find(([name]) => key.includes(name));
  if (match) {
    flyToLocation(viewer, match[1][0], match[1][1], 500000);
    return;
  }

  // Fallback — try as numbers
  console.log('Search: no match for', q);
}

// Data age updater
setInterval(() => {
  const age = Date.now() - flightTracker.lastUpdateTime;
  hud.updateDataAge(age);
}, 1000);

// Start all systems
async function boot() {
  console.log('[WORLDVIEW] Booting systems...');

  // Set initial camera — overview of Earth
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-40, 30, 20000000),
    duration: 0,
  });

  // Load Google 3D Tiles (default view)
  await initGoogle3DTiles(viewer);
  controls.setTileMode(true);

  // Start traffic particle system
  trafficParticles.start();

  // Start data feeds (parallel)
  const results = await Promise.allSettled([
    flightTracker.start(),
    satRenderer.start(),
    earthquakeLayer.load(),
  ]);

  results.forEach((r, i) => {
    const names = ['Flights', 'Satellites', 'Earthquakes'];
    if (r.status === 'fulfilled') {
      console.log(`[WORLDVIEW] ${names[i]} ✓`);
    } else {
      console.warn(`[WORLDVIEW] ${names[i]} failed:`, r.reason);
    }
  });

  // Update earthquake count
  hud.updateQuakeCount(earthquakeLayer.quakeCount);

  console.log('[WORLDVIEW] All systems online.');
}

boot();
