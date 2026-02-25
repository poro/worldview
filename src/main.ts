import './style.css';
import * as Cesium from 'cesium';
import { createViewer, flyToLocation } from './globe/viewer';
import { FlightTracker } from './flights/tracker';
import { SatelliteRenderer } from './satellites/renderer';
import { FilterManager, FilterMode } from './filters/manager';
import { EarthquakeLayer } from './osint/earthquakes';
import { HUD } from './ui/hud';
import { DetailPanel } from './ui/panel';
import { Controls } from './ui/controls';

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
const hud = new HUD(viewer);
const detailPanel = new DetailPanel();

// Wire up callbacks
flightTracker.setOnCountUpdate((count) => hud.updateFlightCount(count));
satRenderer.setOnCountUpdate((count) => hud.updateSatCount(count));
filterManager.setOnChange((mode) => hud.updateFilter(mode));

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

// Controls
const controls = new Controls({
  onFilterChange: (mode: FilterMode) => {
    filterManager.setFilter(mode);
    controls.setActiveFilter(mode);
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
  onToggleHUD: () => {
    hud.toggle();
  },
  onSearch: (query: string) => {
    handleSearch(query);
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
      break;
    case '2':
      filterManager.setByIndex(1);
      controls.setActiveFilter('nightvision');
      break;
    case '3':
      filterManager.setByIndex(2);
      controls.setActiveFilter('flir');
      break;
    case '4':
      filterManager.setByIndex(3);
      controls.setActiveFilter('crt');
      break;
    case '5':
      filterManager.setByIndex(4);
      controls.setActiveFilter('enhanced');
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
    case 'q':
    case 'Q':
      earthquakeLayer.toggle();
      controls.setLayerState('earthquakes', earthquakeLayer.visible);
      break;
    case 'h':
    case 'H':
      hud.toggle();
      break;
    case '/':
      e.preventDefault();
      (window as any).__searchInput?.focus();
      break;
    case 'Escape':
      detailPanel.hide();
      flightTracker.selectByIcao(null);
      satRenderer.selectByNoradId(null);
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
