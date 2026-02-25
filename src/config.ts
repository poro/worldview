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
export const AIRCRAFT_ICON_SIZE = 20;
export const AIRCRAFT_ICON_SIZE_MILITARY = 22;
export const AIRCRAFT_LABEL_FONT = '11px JetBrains Mono';
export const SAT_LABEL_FONT = '10px JetBrains Mono';
export const EQ_LABEL_FONT = '10px JetBrains Mono';

// --- Scale by Distance ---
export const AIRCRAFT_SCALE_NEAR = 1.5;
export const AIRCRAFT_SCALE_FAR = 0.4;
export const AIRCRAFT_SCALE_NEAR_DIST = 1e4;
export const AIRCRAFT_SCALE_FAR_DIST = 1e7;
export const AIRCRAFT_TRANS_NEAR_DIST = 1e4;
export const AIRCRAFT_TRANS_FAR_DIST = 2e7;

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

  // Military
  military: '#ff4500',
  militaryLabel: '#ff6633',
  commercialLabel: '#c0c0c0',
  commercialDimAlpha: 0.15,

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
} as const;

// --- CORS Proxy ---
export const PROXY_URL = 'https://worldview-proxy.mark-ollila.workers.dev';

// --- Toast Duration ---
export const TOAST_DURATION = 2500;
export const ERROR_TOAST_DURATION = 5000;
