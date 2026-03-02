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

// --- Colors ---
export const COLORS = {
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

  // UI
  accent: '#00ff88',
  cyan: '#00e5ff',
  red: '#ff3d3d',
  amber: '#ffb300',
} as const;
