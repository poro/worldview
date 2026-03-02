// ============================================
// WORLDVIEW Configuration Constants
// ============================================

// --- Update Intervals (ms) ---
export const FLIGHT_UPDATE_INTERVAL = 15000;
export const SATELLITE_POSITION_UPDATE_INTERVAL = 2000;
export const DATA_AGE_UPDATE_INTERVAL = 1000;

// --- Flight Config ---
export const FLIGHT_TRAIL_MAX_POINTS = 8;
export const FLIGHT_TRAIL_WIDTH = 1.5;

// --- Satellite Config ---
export const SAT_MAX_PER_CATEGORY: Record<string, number> = {
  stations: 100,
  starlink: 2000,
  military: 300,
  weather: 100,
  gps: 50,
};
export const SAT_ORBIT_STEPS = 180;
export const SAT_ORBIT_LINE_WIDTH = 1.5;
export const SAT_ORBIT_GLOW_POWER = 0.2;
export const SAT_GROUND_TRACK_DASH_LENGTH = 16;

// --- Earthquake Config ---
export const EQ_ELLIPSE_SCALE = 50000; // meters per magnitude unit
export const EQ_PULSE_MIN_SCALE = 0.85;
export const EQ_PULSE_MAX_SCALE = 1.15;
export const EQ_PULSE_PERIOD = 2000; // ms

// --- Maritime Config ---
export const MARITIME_UPDATE_INTERVAL = 60000; // 60s (AIS data is slower)
export const MARITIME_TRAIL_MAX_POINTS = 12;
export const MARITIME_TRAIL_WIDTH = 1.5;

// --- Traffic Config ---
export const TRAFFIC_MAX_PARTICLES = 2500;
export const TRAFFIC_ALTITUDE_THRESHOLD = 10000; // meters
export const TRAFFIC_CACHE_MARGIN = 0.3;
export const TRAFFIC_FETCH_COOLDOWN = 5000; // ms
export const TRAFFIC_ROAD_SPEEDS: Record<string, number> = {
  motorway: 30,
  trunk: 22,
  primary: 14,
  secondary: 9,
};
export const TRAFFIC_ROAD_WEIGHTS: Record<string, number> = {
  motorway: 3,
  trunk: 2,
  primary: 1.5,
  secondary: 1,
};

// --- Entity Visual Config ---
export const AIRCRAFT_ICON_SIZE = 44;
export const AIRCRAFT_ICON_SIZE_MILITARY = 52;
export const AIRCRAFT_LABEL_FONT = '11px JetBrains Mono';
export const SAT_LABEL_FONT = '10px JetBrains Mono';
export const EQ_LABEL_FONT = '10px JetBrains Mono';

// --- Scale by Distance ---
export const AIRCRAFT_SCALE_NEAR = 1.8;
export const AIRCRAFT_SCALE_FAR = 0.7;
export const AIRCRAFT_SCALE_NEAR_DIST = 1e4;
export const AIRCRAFT_SCALE_FAR_DIST = 5e7;
export const AIRCRAFT_TRANS_NEAR_DIST = 1e4;
export const AIRCRAFT_TRANS_FAR_DIST = 5e7;

// --- Colors ---
export const COLORS = {
  // Altitude bands
  altLow: '#00ff88',      // <1km
  altMedLow: '#00e5ff',   // 1-3km
  altMed: '#4dabf7',      // 3-8km
  altMedHigh: '#ffb300',  // 8-12km
  altHigh: '#ff3d3d',     // >12km

  // Satellite categories
  satStations: '#ff3d3d',
  satStarlink: '#4dabf7',
  satMilitary: '#ffb300',
  satWeather: '#00e5ff',
  satGps: '#00ff88',

  // Military aircraft categories
  military: '#ff4500',
  militaryLabel: '#ff6633',
  milFighter: '#ff3d3d',
  milBomber: '#ff3d3d',
  milTanker: '#ffb300',
  milISR: '#ff8c00',
  milTransport: '#00ff88',
  milHelicopter: '#00e5ff',
  commercialLabel: '#c0c0c0',
  commercialDimAlpha: 0.15,

  // Maritime vessel types
  vesselCargo: '#808080',
  vesselTanker: '#4dabf7',
  vesselPassenger: '#ffffff',
  vesselFishing: '#00e5ff',
  vesselMilitary: '#ff3d3d',
  vesselTug: '#ffb300',

  // UI
  accent: '#00ff88',
  cyan: '#00e5ff',
  red: '#ff3d3d',
  amber: '#ffb300',

  // Earthquake
  eqHigh: '#ff0000',
  eqMed: '#ff8c00',
  eqLow: '#ffff00',
  eqOutline: '#ff3d3d',
  eqEllipse: '#ff0000',

  // Strike markers
  strikeFlash: '#ff4500',
  strikePulse: '#ff6600',
  strikeAir: '#ff3d3d',
  strikeMissile: '#ffb300',
  strikeDrone: '#ff8c00',
  strikeLabel: '#ff6633',

  // GPS interference severity
  gpsMinor: '#ffff00',
  gpsModerate: '#ffb300',
  gpsSevere: '#ff3d3d',
  gpsEdge: '#ff8c00',

  // Airspace status
  airspaceClosed: '#ff3d3d',
  airspaceRestricted: '#ffb300',
  airspacePartial: '#ffff00',

  // Shipping status
  laneOpen: '#00ff88',
  laneDelayed: '#ffb300',
  laneBlocked: '#ff3d3d',
  chokepoint: '#00e5ff',
} as const;

// --- CORS Proxy ---
export const PROXY_URL = 'https://worldview-proxy.mark-ollila.workers.dev';

// --- Toast Duration ---
export const TOAST_DURATION = 2500;
export const ERROR_TOAST_DURATION = 5000;
// ============================================
// Event Overlay Configuration Constants
// ============================================

// --- Strike Config ---
export const STRIKE_PULSE_PERIOD = 1800; // ms
export const STRIKE_PULSE_MIN_SCALE = 0.8;
export const STRIKE_PULSE_MAX_SCALE = 1.2;
export const STRIKE_ELLIPSE_BASE = 40000; // meters base radius for pulse ring
export const STRIKE_LABEL_FONT = '10px JetBrains Mono';
export const STRIKE_BLAST_RING_COUNT = 3;
export const STRIKE_BLAST_RING_ALPHA = 0.06;

// --- GPS Interference Config ---
export const GPS_PULSE_PERIOD = 3000; // ms
export const GPS_EDGE_PULSE_MIN_ALPHA = 0.1;
export const GPS_EDGE_PULSE_MAX_ALPHA = 0.4;
export const GPS_FILL_ALPHA = 0.12;
export const GPS_LABEL_FONT = '10px JetBrains Mono';

// --- Airspace Config ---
export const AIRSPACE_FILL_ALPHA = 0.15;
export const AIRSPACE_OUTLINE_ALPHA = 0.7;
export const AIRSPACE_OUTLINE_WIDTH = 2;
export const AIRSPACE_LABEL_FONT = '11px JetBrains Mono';

// --- Shipping Config ---
export const SHIPPING_LANE_WIDTH = 4;
export const SHIPPING_DASH_LENGTH = 16;
export const SHIPPING_DASH_PATTERN = 12;
export const SHIPPING_LABEL_FONT = '10px JetBrains Mono';
export const CHOKEPOINT_ICON_SIZE = 14;

// (overlay colors merged into main COLORS above)
