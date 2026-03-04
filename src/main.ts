import './style.css';
import { smartInterval } from './tick';
import { bus } from './bus';
import { initKeyboard } from './keyboard';
import { handleSearch } from './search';
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
import { ViewScoutPanel } from './viewscout';
import { MaritimeTracker } from './maritime/tracker';
import { DATA_AGE_UPDATE_INTERVAL } from './config';
import { StrikeLayer } from './osint/strikes';
import { GpsInterferenceLayer } from './osint/gps-interference';
import { AirspaceLayer } from './osint/airspace';
import { ShippingLayer } from './osint/shipping';
import { ZoomControls } from './ui/zoom-controls';
import { TimeController } from './time/controller';
import { Timeline } from './ui/timeline';
import { SnapshotAPIAdapter, TimelineEvent } from './time/data-adapter';
import { CountryLayer } from './layers/countries';
import { InternetBlackoutLayer } from './layers/internet-blackout';
import { EventCardLayer } from './layers/event-cards';
import { HexBinLayer } from './layers/hex-bins';
import { NewsTicker } from './ui/news-ticker';
import { ThreatBar } from './ui/threat-bar';
import { DataSourcesPanel } from './ui/data-sources';
import { FilterBar } from './ui/filter-bar';
import { ViewModeManager } from './ui/view-modes';
import { RightPanel } from './ui/right-panel';
import { AircraftPopup } from './ui/aircraft-popup';
import { toggleHelp } from './ui/help-overlay';
import { registerCommands, openPalette } from './ui/command-palette';
import { CONFLICT_EVENTS } from './data/events';
import { INFO_EVENTS } from './data/events-info';
import { INFO_EVENT_COLORS } from './feed/types';
import { FeedManager } from './feed/manager';

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
const maritimeTracker = new MaritimeTracker(viewer);
const strikeLayer = new StrikeLayer(viewer);
const gpsLayer = new GpsInterferenceLayer(viewer);
const airspaceLayer = new AirspaceLayer(viewer);
const shippingLayer = new ShippingLayer(viewer);
new ZoomControls(viewer);

// New visual overhaul layers
const countryLayer = new CountryLayer(viewer);
const internetBlackoutLayer = new InternetBlackoutLayer(viewer);
const eventCardLayer = new EventCardLayer(viewer);
const hexBinLayer = new HexBinLayer(viewer);
const viewModeManager = new ViewModeManager();

// Time Controller + Timeline — wire to all data layers
const timeController = new TimeController();
flightTracker.setTimeController(timeController);
satRenderer.setTimeController(timeController);
maritimeTracker.setTimeController(timeController);
// Recorder API — use vite proxy in dev, direct URL in prod won't work through tunnel yet
// For now, wrap in try/catch so it doesn't break the app
const recorderBaseUrl = '/recorder';
const eventAdapter = new SnapshotAPIAdapter('events', recorderBaseUrl);
// Timeline created here but wired to controls later (after controls init)
let timeline: Timeline | null = null;
const hud = new HUD(viewer);
hud.setOnModeChange((mode) => {
  if (mode === 'LIVE') {
    timeController.goLive();
  } else {
    // Enter playback — start from 1 hour ago
    const oneHourAgo = new Date(Date.now() - 3600000);
    timeController.seekTo(oneHourAgo);
  }
});
// Sync HUD mode when TimeController state changes
timeController.subscribe((state) => {
  hud.setMode(state.mode === 'LIVE' ? 'LIVE' : 'PLAYBACK');
});
const detailPanel = new DetailPanel();
const effectsPanel = new EffectsPanel();
const viewScoutPanel = new ViewScoutPanel(viewer, {
  onToggle: (active) => {
    controls.setLayerState('viewscout', active);
    if (active) controls.showToast('VIEWSCOUT ACTIVE — CLICK GLOBE TO ANALYZE');
  },
});

// Wire up callbacks
flightTracker.setOnCountUpdate((count) => hud.updateFlightCount(count));
flightTracker.setOnMilitaryCountUpdate((count, categoryCounts) => hud.updateMilitaryCount(count, categoryCounts));
satRenderer.setOnCountUpdate((count) => hud.updateSatCount(count));
filterManager.setOnChange((mode) => {
  hud.updateFilter(mode);
  effectsPanel.setFilter(mode);
});

// Wire effects panel slider changes to filter manager
effectsPanel.setOnParamChange((_filter, params) => {
  filterManager.updateParams(params);
});

flightTracker.setOnSelect((flight, milInfo) => {
  if (flight) detailPanel.showFlight(flight, milInfo);
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

maritimeTracker.setOnSelect((vessel) => {
  if (vessel) detailPanel.showVessel(vessel);
  else detailPanel.hide();
});

maritimeTracker.setOnCountUpdate((total, military) => {
  hud.updateVesselCount(total);
  hud.updateMilitaryVesselCount(military);
});

detailPanel.setOnClose(() => {
  flightTracker.selectByIcao(null);
  satRenderer.selectByNoradId(null);
  maritimeTracker.selectByMmsi(null);
});

// Error callbacks — show toast on data feed failures
flightTracker.setOnError((msg) => controls.showToast(msg, 'error'));
satRenderer.setOnError((msg) => controls.showToast(msg, 'error'));
earthquakeLayer.setOnError((msg) => controls.showToast(msg, 'error'));
maritimeTracker.setOnError((msg) => controls.showToast(msg, 'error'));

// Navigate to location preset
function navigateToPreset(preset: LocationPreset) {
  flyToCinematic(viewer, preset.lon, preset.lat, preset.alt, 2);
  controls.showToast(`NAVIGATING \u2192 ${preset.label.toUpperCase()}`);
}

// Lazy-start tracking — layers only initialize when first toggled ON
const layerStarted: Record<string, boolean> = { flights: true }; // flights starts at boot

async function lazyStart(id: string, startFn: () => Promise<void> | void) {
  if (!layerStarted[id]) {
    layerStarted[id] = true;
    try { await startFn(); console.log(`[WORLDVIEW] ${id} ✓`); }
    catch (e) { console.warn(`[WORLDVIEW] ${id} failed:`, e); }
  }
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
    lazyStart('satellites', () => satRenderer.start());
    satRenderer.toggle();
    controls.setLayerState('satellites', satRenderer.visible);
  },
  onToggleEarthquakes: () => {
    lazyStart('earthquakes', () => { earthquakeLayer.load(); hud.updateQuakeCount(earthquakeLayer.quakeCount); });
    earthquakeLayer.toggle();
    controls.setLayerState('earthquakes', earthquakeLayer.visible);
  },
  onToggleTraffic: () => {
    lazyStart('traffic', () => trafficParticles.start());
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
    handleSearch(query, viewer);
  },
  onLocationSelect: (preset: LocationPreset) => {
    navigateToPreset(preset);
  },
  onToggleViewScout: () => {
    viewScoutPanel.toggle();
  },
  onToggleMaritime: () => {
    lazyStart('maritime', () => maritimeTracker.start());
    maritimeTracker.toggle();
    controls.setLayerState('maritime', maritimeTracker.visible);
  },
  onToggle3D: () => {
    const enabled = toggleGoogle3D(viewer);
    controls.setTileMode(enabled);
    controls.showToast(enabled ? 'GOOGLE 3D TILES' : 'STANDARD VIEW');
  },
});

// Initialize Timeline (after controls exist)
timeline = new Timeline(timeController, {
  onFlyToEvent: (evt) => {
    flyToCinematic(viewer, evt.lon, evt.lat, 500000, 1.5);
  },
  onModeChange: (mode) => {
    controls.showToast(mode === 'LIVE' ? 'LIVE MODE' : 'REPLAY MODE');
  },
}, eventAdapter);
timeline.setRange(new Date('2026-02-28T00:00:00Z'), new Date());

// Load conflict events + info events into timeline
const conflictTimelineEvents: TimelineEvent[] = CONFLICT_EVENTS.map(evt => ({
  time: new Date(evt.time),
  lat: evt.lat,
  lon: evt.lon,
  title: evt.title,
  type: evt.type,
  description: evt.description,
}));
const infoTimelineEvents: TimelineEvent[] = INFO_EVENTS.map(evt => ({
  time: new Date(evt.time),
  lat: evt.lat,
  lon: evt.lon,
  title: evt.title,
  type: evt.type,
  description: evt.description,
}));
timeline.setEvents([...conflictTimelineEvents, ...infoTimelineEvents]);

// The Feed — information warfare layer
const feedManager = new FeedManager();
feedManager.init(viewer, timeController);
feedManager.setOnFlyTo((lon, lat) => {
  flyToCinematic(viewer, lon, lat, 500000, 1.5);
});
feedManager.setOnToast((msg) => {
  controls.showToast(msg);
});

// News ticker — live articles scrolling at bottom
const newsTicker = new NewsTicker();

// Threat bar — top-right status indicators
const threatBar = new ThreatBar();

// Data sources panel — bottom-left health indicators
const dataSourcesPanel = new DataSourcesPanel();
bus.on('source:update', (id: string, count: number) => {
  dataSourcesPanel.updateSource(id, 'active', count);
});
bus.on('feed:loaded', (_count: number, articles: import('./feed/types').LiveArticle[]) => {
  newsTicker.setArticles(articles);
});

// Aircraft hover popup
const aircraftPopup = new AircraftPopup(viewer);
aircraftPopup.setFlightDataProvider((icao) => flightTracker.getFlightData(icao));

// Filter bar (bottom pills)
const filterBar = new FilterBar({
  onToggle: (id, active) => {
    switch (id) {
      case 'commercial': flightTracker.toggle(); break;
      case 'military': flightTracker.toggleMilitary(); break;
      case 'gps-jamming': lazyStart('gps', () => gpsLayer.load()); gpsLayer.toggle(); break;
      case 'ground-truth': eventCardLayer.toggle(); break;
      case 'imaging-sats': lazyStart('satellites', () => satRenderer.start()); satRenderer.toggle(); break;
      case 'maritime': lazyStart('maritime', () => maritimeTracker.start()); maritimeTracker.toggle(); break;
      case 'airspace': lazyStart('airspace', () => airspaceLayer.load()); airspaceLayer.toggle(); break;
      case 'blackout': lazyStart('blackout', () => internetBlackoutLayer.load()); internetBlackoutLayer.toggle(); break;
      case 'borders': lazyStart('borders', () => countryLayer.load()); countryLayer.toggle(); break;
      // Event type filters
      case 'evt-kinetic':
      case 'evt-retaliation':
      case 'evt-civilian':
      case 'evt-war':
      case 'evt-infrastructure':
      case 'evt-escalation':
        // Filter event cards by active event types
        break;
      default:
        console.log(`[FilterBar] Unhandled toggle: ${id} → ${active}`);
    }
  },
});

// Right panel
const rightPanel = new RightPanel({
  onViewModeChange: (_mode) => {
    // View mode already applied by ViewModeManager inside the panel
  },
  onToggleHUD: () => hud.toggle(),
  onToggleFlights: () => {
    flightTracker.toggle();
    controls.setLayerState('flights', flightTracker.visible);
  },
  onToggleSatellites: () => {
    satRenderer.toggle();
    controls.setLayerState('satellites', satRenderer.visible);
  },
  onCleanUI: () => {
    hud.toggle();
    controls.showToast('CLEAN UI');
  },
}, viewModeManager);

// Suppress unused variable warnings
void filterBar;
void rightPanel;
void aircraftPopup;

// Entity picking
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
  const picked = viewer.scene.pick(click.position);
  if (picked) {
    if (flightTracker.handlePick(picked)) return;
    if (satRenderer.handlePick(picked)) return;
    if (earthquakeLayer.handlePick(picked)) return;
    if (cctvLayer.handlePick(picked)) return;
    if (maritimeTracker.handlePick(picked)) return;
    if (strikeLayer.handlePick(picked)) return;
    if (gpsLayer.handlePick(picked)) return;
    if (airspaceLayer.handlePick(picked)) return;
    if (shippingLayer.handlePick(picked)) return;
    if (eventCardLayer.handlePick(picked)) return;
  }
  // Clicked empty space — deselect
  detailPanel.hide();
  flightTracker.selectByIcao(null);
  satRenderer.selectByNoradId(null);
  maritimeTracker.selectByMmsi(null);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// ============================================================
// Bus subscriptions — keyboard.ts emits, main.ts dispatches
// ============================================================
initKeyboard();

bus.on('filter:set', (index: number, mode: string) => {
  filterManager.setByIndex(index);
  controls.setActiveFilter(mode as FilterMode);
  effectsPanel.setFilter(mode as FilterMode);
});

bus.on('layer:toggle', (layer: string) => {
  switch (layer) {
    case 'cctv': cctvLayer.toggle(); controls.setLayerState('cctv', cctvLayer.visible); break;
    case 'flights': flightTracker.toggle(); controls.setLayerState('flights', flightTracker.visible); break;
    case 'satellites': satRenderer.toggle(); controls.setLayerState('satellites', satRenderer.visible); break;
    case 'earthquakes': earthquakeLayer.toggle(); controls.setLayerState('earthquakes', earthquakeLayer.visible); break;
    case 'traffic': trafficParticles.toggle(); controls.setLayerState('traffic', trafficParticles.visible); break;
    case 'military': flightTracker.toggleMilitary(); controls.setLayerState('military', flightTracker.militaryMode); break;
    case 'feed': feedManager.toggleFeedLayer(); break;
    case 'fog': feedManager.toggleFogOverlay(); break;
    case 'network': feedManager.toggleNetworkGraph(); break;
    case 'gps': gpsLayer.toggle(); controls.showToast(gpsLayer.visible ? 'GPS INTERFERENCE ON' : 'GPS INTERFERENCE OFF'); break;
    case 'airspace': airspaceLayer.toggle(); controls.showToast(airspaceLayer.visible ? 'NO-FLY ZONES ON' : 'NO-FLY ZONES OFF'); break;
    case 'strikes': lazyStart('strikes', () => strikeLayer.load()); strikeLayer.toggle(); controls.showToast(strikeLayer.visible ? 'STRIKES ON' : 'STRIKES OFF'); break;
    case 'shipping': lazyStart('shipping', () => shippingLayer.load()); shippingLayer.toggle(); controls.showToast(shippingLayer.visible ? 'SHIPPING LANES ON' : 'SHIPPING LANES OFF'); break;
    case 'maritime': maritimeTracker.toggle(); controls.setLayerState('maritime', maritimeTracker.visible); break;
  }
});

bus.on('ui:toggle', (panel: string) => {
  switch (panel) {
    case 'hud': hud.toggle(); break;
    case 'viewscout': viewScoutPanel.toggle(); break;
    case 'ticker': newsTicker.toggle(); break;
  }
});

bus.on('nav:preset', (key: string) => {
  const preset = LOCATION_PRESETS.find((p) => p.key === key);
  if (preset) navigateToPreset(preset);
});

bus.on('nav:flyto', (lon: number, lat: number, alt: number, duration?: number) => {
  flyToCinematic(viewer, lon, lat, alt, duration || 2);
});

bus.on('ui:toast', (message: string) => {
  controls.showToast(message);
});

bus.on('entity:deselect', () => {
  detailPanel.hide();
  flightTracker.selectByIcao(null);
  satRenderer.selectByNoradId(null);
  maritimeTracker.selectByMmsi(null);
  cctvLayer.closeFeedPanel();
});

// Data age updater + Feed HUD stats
smartInterval(() => {
  const age = Date.now() - flightTracker.lastUpdateTime;
  hud.updateDataAge(age);
  hud.updateFeedStats(
    feedManager.getVisibleClaimCount(),
    feedManager.getTotalClaimCount(),
    feedManager.feedVisible,
  );
}, DATA_AGE_UPDATE_INTERVAL);

// Start all systems
async function boot() {
  console.log('[WORLDVIEW] Booting systems...');

  // Set initial camera — global view (user can navigate to theater of interest)
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-30, 20, 20000000),
    duration: 0,
  });

  // Load Google 3D Tiles (default view)
  try {
    await initGoogle3DTiles(viewer);
    controls.setTileMode(true);
  } catch (e) {
    console.warn('[WORLDVIEW] Google 3D Tiles failed:', e);
    controls.showToast('3D TILES UNAVAILABLE', 'error');
  }

  // Only start flights at boot — other layers start on-demand when toggled
  try {
    await flightTracker.start();
    console.log('[WORLDVIEW] Flights ✓');
  } catch (e) {
    console.warn('[WORLDVIEW] Flights failed:', e);
    controls.showToast('FLIGHT DATA UNAVAILABLE', 'error');
  }

  // Load only event cards at boot — all other overlays load on-demand via filter bar
  try {
    eventCardLayer.load();
    console.log('[WORLDVIEW] Event Cards ✓');
  } catch (e) { console.warn('[WORLDVIEW] Event Cards failed:', e); }

  // Register lazy loaders for conflict overlays (triggered by filter bar toggles)
  // These will load on first toggle via the filterBar onToggle handler

  // Load The Feed — information warfare layer
  try {
    // Feed starts in live mode — loads on first toggle (N key)
    // For scenario replay: feedManager.loadScenario('epic-fury');
    console.log('[WORLDVIEW] The Feed ✓');
  } catch (e) { console.warn('[WORLDVIEW] The Feed failed:', e); }

  console.log('[WORLDVIEW] All systems online.');

  // Register command palette commands
  registerCommands([
    // Layers
    { id: 'flights', label: 'Toggle Flights', section: 'LAYERS', shortcut: 'F', action: () => { flightTracker.toggle(); controls.setLayerState('flights', flightTracker.visible); }},
    { id: 'satellites', label: 'Toggle Satellites', section: 'LAYERS', shortcut: 'S', action: () => { lazyStart('satellites', () => satRenderer.start()); satRenderer.toggle(); controls.setLayerState('satellites', satRenderer.visible); }},
    { id: 'maritime', label: 'Toggle Maritime / Ships', section: 'LAYERS', shortcut: 'M', action: () => { lazyStart('maritime', () => maritimeTracker.start()); maritimeTracker.toggle(); controls.setLayerState('maritime', maritimeTracker.visible); }},
    { id: 'traffic', label: 'Toggle Traffic', section: 'LAYERS', shortcut: 'T', action: () => { lazyStart('traffic', () => trafficParticles.start()); trafficParticles.toggle(); controls.setLayerState('traffic', trafficParticles.visible); }},
    { id: 'quakes', label: 'Toggle Earthquakes', section: 'LAYERS', shortcut: 'G', action: () => { lazyStart('earthquakes', () => earthquakeLayer.load()); earthquakeLayer.toggle(); controls.setLayerState('earthquakes', earthquakeLayer.visible); }},
    { id: 'cctv', label: 'Toggle CCTV Feeds', section: 'LAYERS', shortcut: 'C', action: () => { cctvLayer.toggle(); controls.setLayerState('cctv', cctvLayer.visible); }},
    { id: 'events', label: 'Toggle Event Cards', section: 'LAYERS', action: () => eventCardLayer.toggle() },
    { id: 'gps', label: 'Toggle GPS Interference', section: 'LAYERS', action: () => { lazyStart('gps', () => gpsLayer.load()); gpsLayer.toggle(); }},
    { id: 'strikes', label: 'Toggle Strike Markers', section: 'LAYERS', shortcut: 'W', action: () => { lazyStart('strikes', () => strikeLayer.load()); strikeLayer.toggle(); }},
    { id: 'shipping', label: 'Toggle Shipping Lanes', section: 'LAYERS', shortcut: 'L', action: () => { lazyStart('shipping', () => shippingLayer.load()); shippingLayer.toggle(); }},
    { id: 'airspace', label: 'Toggle Airspace Zones', section: 'LAYERS', action: () => { lazyStart('airspace', () => airspaceLayer.load()); airspaceLayer.toggle(); }},
    { id: 'blackout', label: 'Toggle Internet Blackout', section: 'LAYERS', action: () => { lazyStart('blackout', () => internetBlackoutLayer.load()); internetBlackoutLayer.toggle(); }},
    { id: 'borders', label: 'Toggle Country Borders', section: 'LAYERS', shortcut: 'B', action: () => { lazyStart('borders', () => countryLayer.load()); countryLayer.toggle(); }},
    { id: 'hexbins', label: 'Toggle Hex Bins', section: 'LAYERS', shortcut: 'X', action: () => { lazyStart('hexbins', () => hexBinLayer.load()); hexBinLayer.toggle(); }},
    // Feed
    { id: 'news', label: 'Toggle Live News Feed', section: 'FEED', shortcut: 'N', action: () => feedManager.toggleFeedLayer() },
    { id: 'scenario', label: 'Load Epic Fury Scenario', section: 'FEED', action: () => feedManager.loadScenario('epic-fury') },
    // Navigation
    ...LOCATION_PRESETS.map(p => ({
      id: `nav-${p.key}`, label: `Navigate → ${p.label}`, section: 'NAVIGATE', shortcut: p.key,
      action: () => { flyToCinematic(viewer, p.lon, p.lat, p.alt, 2); controls.showToast(`NAVIGATING → ${p.label}`); },
    })),
    { id: 'iran', label: 'Navigate → Iran Theater', section: 'NAVIGATE', shortcut: 'P', action: () => { flyToCinematic(viewer, 53, 32, 3000000, 2); controls.showToast('NAVIGATING → IRAN THEATER'); }},
    // Visual Filters
    { id: 'filter-normal', label: 'Filter: Normal', section: 'VISUAL', action: () => { filterManager.setFilter('normal'); controls.setActiveFilter('normal'); }},
    { id: 'filter-nvg', label: 'Filter: Night Vision', section: 'VISUAL', action: () => { filterManager.setFilter('nightvision'); controls.setActiveFilter('nightvision'); }},
    { id: 'filter-flir', label: 'Filter: FLIR / Thermal', section: 'VISUAL', action: () => { filterManager.setFilter('flir'); controls.setActiveFilter('flir'); }},
    { id: 'filter-crt', label: 'Filter: CRT', section: 'VISUAL', action: () => { filterManager.setFilter('crt'); controls.setActiveFilter('crt'); }},
    { id: 'filter-enhanced', label: 'Filter: Enhanced', section: 'VISUAL', action: () => { filterManager.setFilter('enhanced'); controls.setActiveFilter('enhanced'); }},
    // Tools
    { id: 'viewscout', label: 'Toggle ViewScout', section: 'TOOLS', shortcut: 'V', action: () => viewScoutPanel.toggle() },
    { id: '3d', label: 'Toggle 3D Tiles', section: 'TOOLS', shortcut: 'D', action: () => { const enabled = toggleGoogle3D(viewer); controls.setTileMode(enabled); }},
    { id: 'hud', label: 'Toggle HUD', section: 'TOOLS', shortcut: 'H', action: () => hud.toggle() },
    { id: 'help', label: 'Show Keyboard Shortcuts', section: 'TOOLS', shortcut: '?', action: () => toggleHelp() },
  ]);
}

boot();
