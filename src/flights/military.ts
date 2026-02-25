import { FlightState } from './types';

// US Military ICAO hex ranges
const MILITARY_ICAO_RANGES: [number, number][] = [
  [0xae0000, 0xae0fff], // US Army
  [0xadf000, 0xadffff], // US Military various
  [0xadf7c0, 0xadf7ff], // USAF
  [0xa00001, 0xa00fff], // US DOD
  [0xac0000, 0xacffff], // US Military
  [0x3b0000, 0x3bffff], // France Military
  [0x3f0000, 0x3fffff], // UK Military (RAF)
  [0x43c000, 0x43cfff], // NATO
  [0x700000, 0x700fff], // Israel Military
  [0xe40000, 0xe40fff], // Brazil Military
];

// Military callsign prefixes
const MILITARY_CALLSIGN_PREFIXES = [
  'RCH',    // C-17 Globemaster
  'EVAC',   // Medevac
  'DUKE',   // Special operations
  'TOPCAT', // Tanker operations
  'REAPER', // MQ-9 Reaper UAV
  'VIPER',  // F-16 / attack aviation
  'COBRA',  // Attack helicopter
  'NATO',   // NATO flights
  'JAKE',   // NATO AWACS
  'MAGIC',  // NATO operations
  'REACH',  // AMC cargo
  'DOOM',   // B-2/B-52
  'BONE',   // B-1 Lancer
  'RAGE',   // Fighter ops
  'HAVOC',  // Army aviation
  'FURY',   // Fighter ops
  'GHOST',  // Special ops
  'KNIFE',  // Special ops
  'SWORD',  // Special ops
  'HAWK',   // Various military
  'COMET',  // C-130
  'TITAN',  // C-5 Galaxy
  'MOOSE',  // C-17
  'PACK',   // Tanker
  'ETHYL',  // Tanker
  'SHELL',  // Tanker
  'TEAL',   // Navy
  'NAVY',   // Navy
  'ARMY',   // Army
  'SAM',    // Special Air Mission (VIP)
  'EXEC',   // Executive transport
  'AF1',    // Air Force One
  'AF2',    // Air Force Two
  'MARKO',  // P-8 Poseidon
  'FORTE',  // RQ-4 Global Hawk
  'NCHO',   // NATO
  'BAF',    // Belgian Air Force
  'GAF',    // German Air Force
  'IAM',    // Italian Air Force
  'ASCE',   // US STRATCOM
];

export function isMilitaryFlight(flight: FlightState): boolean {
  // Check ICAO hex range
  const icaoHex = parseInt(flight.icao24, 16);
  if (!isNaN(icaoHex)) {
    for (const [low, high] of MILITARY_ICAO_RANGES) {
      if (icaoHex >= low && icaoHex <= high) return true;
    }
  }

  // Check callsign prefix
  const callsign = flight.callsign.toUpperCase().trim();
  if (callsign) {
    for (const prefix of MILITARY_CALLSIGN_PREFIXES) {
      if (callsign.startsWith(prefix)) return true;
    }
  }

  return false;
}

// Diamond SVG icon for military aircraft
export const MILITARY_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="white" stroke-width="2"><polygon points="16,2 28,16 16,30 4,16"/><line x1="16" y1="2" x2="16" y2="30" stroke-width="1" opacity="0.5"/><line x1="4" y1="16" x2="28" y2="16" stroke-width="1" opacity="0.5"/></svg>`)}`;
