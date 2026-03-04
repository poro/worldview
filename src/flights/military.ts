import { FlightState } from './types';

// === Military Aircraft Type Classification ===

export type MilitaryAircraftCategory = 'fighter' | 'bomber' | 'tanker' | 'isr' | 'transport' | 'helicopter' | 'unknown';

export interface MilitaryClassification {
  isMilitary: boolean;
  category: MilitaryAircraftCategory;
  typeName: string;       // e.g. "F-16 Fighting Falcon"
  probableMission: string; // e.g. "Combat Air Patrol"
  baseHint: string;       // e.g. "Likely CONUS USAF base"
}

// US Military ICAO hex ranges
const MILITARY_ICAO_RANGES: [number, number][] = [
  [0xae0000, 0xaeffff], // US Army
  [0xadf000, 0xadffff], // US Military various
  [0xadf7c0, 0xadf7ff], // USAF
  [0xa00001, 0xa00fff], // US DOD
  [0xac0000, 0xacffff], // US Military (broad — includes some civil, filter in UI)
  [0x3b0000, 0x3bffff], // France Military
  [0x3f0000, 0x3fffff], // UK Military (RAF)
  [0x43c000, 0x43cfff], // NATO
  [0x700000, 0x700fff], // Israel Military
  [0xe40000, 0xe40fff], // Brazil Military
];

// Military callsign prefixes mapped to aircraft type
const CALLSIGN_TYPE_MAP: { prefix: string; category: MilitaryAircraftCategory; type: string; mission: string }[] = [
  // Fighters
  { prefix: 'VIPER', category: 'fighter', type: 'F-16 Fighting Falcon', mission: 'Combat Air Patrol' },
  { prefix: 'RAGE', category: 'fighter', type: 'Fighter (Generic)', mission: 'Fighter Operations' },
  { prefix: 'FURY', category: 'fighter', type: 'Fighter (Generic)', mission: 'Fighter Operations' },

  // Bombers
  { prefix: 'DOOM', category: 'bomber', type: 'B-2/B-52 Bomber', mission: 'Strategic Deterrence' },
  { prefix: 'BONE', category: 'bomber', type: 'B-1B Lancer', mission: 'Strategic Bombing' },

  // Tankers
  { prefix: 'TOPCAT', category: 'tanker', type: 'KC-135/KC-46 Tanker', mission: 'Aerial Refueling' },
  { prefix: 'PACK', category: 'tanker', type: 'KC-135 Stratotanker', mission: 'Aerial Refueling' },
  { prefix: 'ETHYL', category: 'tanker', type: 'KC-135 Stratotanker', mission: 'Aerial Refueling' },
  { prefix: 'SHELL', category: 'tanker', type: 'KC-135/KC-46 Tanker', mission: 'Aerial Refueling' },

  // ISR / Surveillance
  { prefix: 'FORTE', category: 'isr', type: 'RQ-4 Global Hawk', mission: 'High-Altitude ISR' },
  { prefix: 'REAPER', category: 'isr', type: 'MQ-9 Reaper', mission: 'ISR / Strike' },
  { prefix: 'MARKO', category: 'isr', type: 'P-8A Poseidon', mission: 'Maritime Patrol / ASW' },
  { prefix: 'JAKE', category: 'isr', type: 'E-3 Sentry AWACS', mission: 'Airborne Early Warning' },
  { prefix: 'ASCE', category: 'isr', type: 'E-6B Mercury', mission: 'STRATCOM Relay' },

  // Transports
  { prefix: 'RCH', category: 'transport', type: 'C-17 Globemaster III', mission: 'Strategic Airlift' },
  { prefix: 'REACH', category: 'transport', type: 'C-17/C-5 Transport', mission: 'AMC Cargo' },
  { prefix: 'MOOSE', category: 'transport', type: 'C-17 Globemaster III', mission: 'Strategic Airlift' },
  { prefix: 'TITAN', category: 'transport', type: 'C-5M Super Galaxy', mission: 'Heavy Airlift' },
  { prefix: 'COMET', category: 'transport', type: 'C-130 Hercules', mission: 'Tactical Airlift' },
  { prefix: 'SAM', category: 'transport', type: 'C-32A (VIP)', mission: 'Special Air Mission' },
  { prefix: 'AF1', category: 'transport', type: 'VC-25A (Air Force One)', mission: 'Presidential Transport' },
  { prefix: 'AF2', category: 'transport', type: 'C-32A (Air Force Two)', mission: 'VP Transport' },
  { prefix: 'EXEC', category: 'transport', type: 'C-40/C-37 (VIP)', mission: 'Executive Transport' },
  { prefix: 'EVAC', category: 'transport', type: 'C-17/C-130 (Medevac)', mission: 'Medical Evacuation' },

  // Helicopters
  { prefix: 'COBRA', category: 'helicopter', type: 'AH-64 Apache', mission: 'Attack Aviation' },
  { prefix: 'HAVOC', category: 'helicopter', type: 'Army Helicopter', mission: 'Army Aviation' },

  // Special operations
  { prefix: 'DUKE', category: 'transport', type: 'Special Operations', mission: 'SOF Transport' },
  { prefix: 'GHOST', category: 'fighter', type: 'Special Operations', mission: 'SOF Operations' },
  { prefix: 'KNIFE', category: 'transport', type: 'Special Operations', mission: 'SOF Operations' },
  { prefix: 'SWORD', category: 'transport', type: 'Special Operations', mission: 'SOF Operations' },

  // Generic military
  { prefix: 'NATO', category: 'transport', type: 'NATO Aircraft', mission: 'NATO Operations' },
  { prefix: 'MAGIC', category: 'isr', type: 'NATO AWACS', mission: 'NATO AEW&C' },
  { prefix: 'NCHO', category: 'transport', type: 'NATO Aircraft', mission: 'NATO Operations' },
  { prefix: 'HAWK', category: 'fighter', type: 'Military Aircraft', mission: 'Military Operations' },
  { prefix: 'TEAL', category: 'fighter', type: 'Navy Fighter', mission: 'Naval Aviation' },
  { prefix: 'NAVY', category: 'fighter', type: 'Navy Aircraft', mission: 'Naval Aviation' },
  { prefix: 'ARMY', category: 'transport', type: 'Army Aircraft', mission: 'Army Operations' },
  { prefix: 'BAF', category: 'fighter', type: 'Belgian AF', mission: 'Allied Operations' },
  { prefix: 'GAF', category: 'transport', type: 'German AF', mission: 'Allied Operations' },
  { prefix: 'IAM', category: 'fighter', type: 'Italian AF', mission: 'Allied Operations' },
];

// Type code patterns for aircraft identification (from ADS-B type designator)
const TYPE_CODE_MAP: { pattern: RegExp; category: MilitaryAircraftCategory; type: string; mission: string }[] = [
  // Fighters
  { pattern: /^F15/, category: 'fighter', type: 'F-15 Eagle', mission: 'Air Superiority' },
  { pattern: /^F16/, category: 'fighter', type: 'F-16 Fighting Falcon', mission: 'Multirole Fighter' },
  { pattern: /^F18/, category: 'fighter', type: 'F/A-18 Hornet', mission: 'Strike Fighter' },
  { pattern: /^F22/, category: 'fighter', type: 'F-22 Raptor', mission: 'Air Dominance' },
  { pattern: /^F35/, category: 'fighter', type: 'F-35 Lightning II', mission: 'Stealth Multirole' },
  { pattern: /^FA18/, category: 'fighter', type: 'F/A-18 Super Hornet', mission: 'Strike Fighter' },
  { pattern: /^EUFI/, category: 'fighter', type: 'Eurofighter Typhoon', mission: 'Multirole Fighter' },
  { pattern: /^RFAL/, category: 'fighter', type: 'Rafale', mission: 'Multirole Fighter' },

  // Bombers
  { pattern: /^B1/, category: 'bomber', type: 'B-1B Lancer', mission: 'Strategic Bombing' },
  { pattern: /^B2/, category: 'bomber', type: 'B-2 Spirit', mission: 'Stealth Bombing' },
  { pattern: /^B52/, category: 'bomber', type: 'B-52 Stratofortress', mission: 'Strategic Bombing' },

  // Tankers
  { pattern: /^K35[ER]/, category: 'tanker', type: 'KC-135 Stratotanker', mission: 'Aerial Refueling' },
  { pattern: /^KC46/, category: 'tanker', type: 'KC-46A Pegasus', mission: 'Aerial Refueling' },
  { pattern: /^KC10/, category: 'tanker', type: 'KC-10 Extender', mission: 'Aerial Refueling' },
  { pattern: /^A330.*MRTT/, category: 'tanker', type: 'A330 MRTT', mission: 'Aerial Refueling' },

  // ISR
  { pattern: /^RC135/, category: 'isr', type: 'RC-135 Rivet Joint', mission: 'SIGINT' },
  { pattern: /^E3/, category: 'isr', type: 'E-3 Sentry AWACS', mission: 'Airborne Early Warning' },
  { pattern: /^E8/, category: 'isr', type: 'E-8 JSTARS', mission: 'Ground Surveillance' },
  { pattern: /^P8/, category: 'isr', type: 'P-8A Poseidon', mission: 'Maritime Patrol' },
  { pattern: /^RQ4/, category: 'isr', type: 'RQ-4 Global Hawk', mission: 'High-Altitude ISR' },
  { pattern: /^MQ9/, category: 'isr', type: 'MQ-9 Reaper', mission: 'ISR / Strike' },
  { pattern: /^MQ1/, category: 'isr', type: 'MQ-1 Predator', mission: 'ISR' },
  { pattern: /^U2/, category: 'isr', type: 'U-2 Dragon Lady', mission: 'High-Altitude ISR' },
  { pattern: /^E6/, category: 'isr', type: 'E-6B Mercury', mission: 'TACAMO' },
  { pattern: /^EP3/, category: 'isr', type: 'EP-3 Aries', mission: 'SIGINT' },

  // Transports
  { pattern: /^C17/, category: 'transport', type: 'C-17 Globemaster III', mission: 'Strategic Airlift' },
  { pattern: /^C5/, category: 'transport', type: 'C-5M Super Galaxy', mission: 'Heavy Airlift' },
  { pattern: /^C130/, category: 'transport', type: 'C-130 Hercules', mission: 'Tactical Airlift' },
  { pattern: /^C2/, category: 'transport', type: 'C-2 Greyhound', mission: 'COD' },
  { pattern: /^C40/, category: 'transport', type: 'C-40 Clipper', mission: 'VIP Transport' },
  { pattern: /^C37/, category: 'transport', type: 'C-37 Gulfstream', mission: 'VIP Transport' },
  { pattern: /^C32/, category: 'transport', type: 'C-32A', mission: 'VIP Transport' },
  { pattern: /^VC25/, category: 'transport', type: 'VC-25A (Air Force One)', mission: 'Presidential' },
  { pattern: /^A400/, category: 'transport', type: 'A400M Atlas', mission: 'Tactical Airlift' },

  // Helicopters
  { pattern: /^UH60/, category: 'helicopter', type: 'UH-60 Black Hawk', mission: 'Utility' },
  { pattern: /^AH64/, category: 'helicopter', type: 'AH-64 Apache', mission: 'Attack' },
  { pattern: /^CH47/, category: 'helicopter', type: 'CH-47 Chinook', mission: 'Heavy Lift' },
  { pattern: /^H60/, category: 'helicopter', type: 'H-60 (Variant)', mission: 'Utility' },
  { pattern: /^MH60/, category: 'helicopter', type: 'MH-60 Seahawk', mission: 'Naval Helicopter' },
  { pattern: /^V22/, category: 'helicopter', type: 'V-22 Osprey', mission: 'Tiltrotor Transport' },
  { pattern: /^MV22/, category: 'helicopter', type: 'MV-22 Osprey', mission: 'Marine Transport' },
  { pattern: /^AH1/, category: 'helicopter', type: 'AH-1 Cobra/Viper', mission: 'Attack' },
];

// === Squawk Code Detection ===

export interface SquawkAlert {
  code: string;
  meaning: string;
  severity: 'emergency' | 'warning' | 'info';
}

const SQUAWK_ALERTS: Record<string, { meaning: string; severity: 'emergency' | 'warning' | 'info' }> = {
  '7700': { meaning: 'EMERGENCY', severity: 'emergency' },
  '7600': { meaning: 'COMM FAILURE', severity: 'warning' },
  '7500': { meaning: 'HIJACK', severity: 'emergency' },
  // Military-specific squawk codes
  '7777': { meaning: 'MIL INTERCEPTOR', severity: 'warning' },
  '4000': { meaning: 'MIL GROUND OPS', severity: 'info' },
  '0100': { meaning: 'MIL FORMATION', severity: 'info' },
  '0200': { meaning: 'MIL FORMATION', severity: 'info' },
  '0300': { meaning: 'MIL FORMATION', severity: 'info' },
  '0400': { meaning: 'MIL FORMATION', severity: 'info' },
  '1200': { meaning: 'VFR (POSSIBLE MIL)', severity: 'info' },
  '4400': { meaning: 'MIL ACTIVITY', severity: 'info' },
  '4500': { meaning: 'MIL ACTIVITY', severity: 'info' },
  '5100': { meaning: 'MIL REFUELING', severity: 'info' },
  '5200': { meaning: 'MIL REFUELING', severity: 'info' },
  '0401': { meaning: 'NORAD ALERT', severity: 'warning' },
};

export function checkSquawk(squawk: string | null): SquawkAlert | null {
  if (!squawk) return null;
  const alert = SQUAWK_ALERTS[squawk];
  if (alert) return { code: squawk, meaning: alert.meaning, severity: alert.severity };
  return null;
}

// === Category Colors ===

export const MILITARY_CATEGORY_COLORS: Record<MilitaryAircraftCategory, string> = {
  fighter: '#ff3d3d',    // Red — combat
  bomber: '#ff3d3d',     // Red — combat
  tanker: '#ffb300',     // Yellow — support
  isr: '#ff8c00',        // Orange — ISR/surveillance
  transport: '#00ff88',  // Green — transport
  helicopter: '#00e5ff', // Cyan — rotary
  unknown: '#ff4500',    // Orange-red — default military
};

// === SVG Icons per Category ===

// Fighter: arrow/delta shape
const FIGHTER_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><polygon points="16,2 26,28 16,22 6,28"/><line x1="8" y1="18" x2="24" y2="18" stroke-width="1"/></svg>`;

// Bomber: heavy delta
const BOMBER_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><polygon points="16,2 28,26 16,20 4,26"/><line x1="6" y1="20" x2="26" y2="20" stroke-width="2"/><line x1="16" y1="8" x2="16" y2="20" stroke-width="1" opacity="0.5"/></svg>`;

// Tanker: circle with wings
const TANKER_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><circle cx="16" cy="16" r="6"/><line x1="4" y1="16" x2="28" y2="16"/><line x1="16" y1="8" x2="16" y2="24"/></svg>`;

// ISR: eye shape
const ISR_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><ellipse cx="16" cy="16" rx="12" ry="6"/><circle cx="16" cy="16" r="3"/><circle cx="16" cy="16" r="1" fill="white"/></svg>`;

// Transport: square with wings
const TRANSPORT_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><rect x="11" y="6" width="10" height="20" rx="2"/><line x1="4" y1="16" x2="28" y2="16"/><line x1="11" y1="24" x2="8" y2="28"/><line x1="21" y1="24" x2="24" y2="28"/></svg>`;

// Helicopter: rotor circle
const HELICOPTER_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="1.5"><circle cx="16" cy="14" r="8" stroke-dasharray="4 2"/><rect x="13" y="14" width="6" height="12" rx="1"/><line x1="16" y1="26" x2="10" y2="30"/><line x1="16" y1="26" x2="22" y2="30"/></svg>`;

// Default military: diamond (existing)
const UNKNOWN_MIL_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="2"><polygon points="16,2 28,16 16,30 4,16"/><line x1="16" y1="2" x2="16" y2="30" stroke-width="1" opacity="0.5"/><line x1="4" y1="16" x2="28" y2="16" stroke-width="1" opacity="0.5"/></svg>`;

export const MILITARY_CATEGORY_SVGS: Record<MilitaryAircraftCategory, string> = {
  fighter: `data:image/svg+xml;base64,${btoa(FIGHTER_SVG_RAW)}`,
  bomber: `data:image/svg+xml;base64,${btoa(BOMBER_SVG_RAW)}`,
  tanker: `data:image/svg+xml;base64,${btoa(TANKER_SVG_RAW)}`,
  isr: `data:image/svg+xml;base64,${btoa(ISR_SVG_RAW)}`,
  transport: `data:image/svg+xml;base64,${btoa(TRANSPORT_SVG_RAW)}`,
  helicopter: `data:image/svg+xml;base64,${btoa(HELICOPTER_SVG_RAW)}`,
  unknown: `data:image/svg+xml;base64,${btoa(UNKNOWN_MIL_SVG_RAW)}`,
};

// Keep legacy export for backward compat
export const MILITARY_SVG = MILITARY_CATEGORY_SVGS.unknown;

// === Base of Origin Hints ===

const BASE_HINTS: Record<string, string> = {
  'RCH': 'Charleston AFB / McChord AFB',
  'REACH': 'AMC Hub (Dover/Travis/McGuire)',
  'MOOSE': 'McChord AFB, WA',
  'TITAN': 'Dover AFB / Travis AFB',
  'COMET': 'Little Rock AFB / Ramstein AB',
  'DOOM': 'Whiteman AFB / Barksdale AFB',
  'BONE': 'Ellsworth AFB / Dyess AFB',
  'TOPCAT': 'McConnell AFB / Fairchild AFB',
  'FORTE': 'Grand Forks AFB / Sigonella NAS',
  'REAPER': 'Creech AFB / Holloman AFB',
  'MARKO': 'NAS Jacksonville / Whidbey Island NAS',
  'JAKE': 'Tinker AFB / Geilenkirchen AB',
  'VIPER': 'Hill AFB / Shaw AFB / Aviano AB',
  'SAM': 'Joint Base Andrews, MD',
  'AF1': 'Joint Base Andrews, MD',
  'AF2': 'Joint Base Andrews, MD',
  'EXEC': 'Joint Base Andrews, MD',
  'EVAC': 'Ramstein AB / CONUS',
  'ASCE': 'Offutt AFB, NE',
};

// === Main Classification Function ===

export function classifyMilitary(flight: FlightState): MilitaryClassification {
  const callsign = flight.callsign.toUpperCase().trim();

  // Check callsign prefix for type match
  for (const entry of CALLSIGN_TYPE_MAP) {
    if (callsign.startsWith(entry.prefix)) {
      return {
        isMilitary: true,
        category: entry.category,
        typeName: entry.type,
        probableMission: entry.mission,
        baseHint: BASE_HINTS[entry.prefix] || '',
      };
    }
  }

  // Check ICAO hex range — known military but type unknown
  const icaoHex = parseInt(flight.icao24, 16);
  if (!isNaN(icaoHex)) {
    for (const [low, high] of MILITARY_ICAO_RANGES) {
      if (icaoHex >= low && icaoHex <= high) {
        // Try to classify by any type code pattern if available in callsign
        for (const tc of TYPE_CODE_MAP) {
          if (tc.pattern.test(callsign)) {
            return {
              isMilitary: true,
              category: tc.category,
              typeName: tc.type,
              probableMission: tc.mission,
              baseHint: '',
            };
          }
        }
        return {
          isMilitary: true,
          category: 'unknown',
          typeName: 'Military Aircraft',
          probableMission: 'Unknown Mission',
          baseHint: '',
        };
      }
    }
  }

  return {
    isMilitary: false,
    category: 'unknown',
    typeName: '',
    probableMission: '',
    baseHint: '',
  };
}

// Legacy compat wrapper
export function isMilitaryFlight(flight: FlightState): boolean {
  return classifyMilitary(flight).isMilitary;
}

// === Category Count Helper ===

export type MilitaryCategoryCounts = Record<MilitaryAircraftCategory, number>;

export function emptyCategoryCounts(): MilitaryCategoryCounts {
  return { fighter: 0, bomber: 0, tanker: 0, isr: 0, transport: 0, helicopter: 0, unknown: 0 };
}
