// === Military Vessel Detection via MMSI ===

// MMSI digits 1-3 = MID (Maritime Identification Digits)
// Military vessels often use specific MID ranges or have type 35 in AIS

// Known military MMSI prefixes by country (3-digit MID)
const MILITARY_MMSI_MIDS: Record<string, string> = {
  // Format: MID prefix -> country
  '338': 'US Navy',
  '303': 'US Navy',
  '369': 'US Coast Guard',
  '232': 'Royal Navy (UK)',
  '233': 'Royal Navy (UK)',
  '226': 'French Navy',
  '227': 'French Navy',
  '211': 'German Navy',
  '244': 'Netherlands Navy',
  '245': 'Netherlands Navy',
  '219': 'Danish Navy',
  '257': 'Norwegian Navy',
  '265': 'Swedish Navy',
  '230': 'Finnish Navy',
  '247': 'Italian Navy',
  '224': 'Spanish Navy',
  '431': 'Japanese Navy (JMSDF)',
  '440': 'South Korean Navy',
  '413': 'Chinese Navy (PLAN)',
  '273': 'Russian Navy',
  '503': 'Royal Australian Navy',
  '316': 'Canadian Navy',
  '710': 'Brazilian Navy',
  '351': 'Indian Navy',
  '525': 'Israeli Navy',
  '271': 'Turkish Navy',
};

// AIS ship type 35 = "Military ops" per ITU-R M.1371
const MILITARY_AIS_TYPES = [35, 55]; // 35 = military, 55 = law enforcement (often military)

// Known hull number patterns in vessel names
const MILITARY_NAME_PATTERNS = [
  /^USS /i,       // US Navy
  /^USNS /i,      // US Navy (civilian crew)
  /^HMS /i,       // Royal Navy
  /^HMAS /i,      // Royal Australian Navy
  /^HMCS /i,      // Royal Canadian Navy
  /^FS /i,        // French Navy
  /^FGS /i,       // German Navy (Federal German Ship)
  /^KNM /i,       // Royal Norwegian Navy
  /^HDMS /i,      // Royal Danish Navy
  /^TCG /i,       // Turkish Navy
  /^JS /i,        // Japan Maritime Self-Defense Force
  /^ROKS /i,      // Republic of Korea Navy
  /^INS /i,       // Indian Navy
  /^ITS /i,       // Italian Navy
  /^ESPS /i,      // Spanish Navy
  /^DDG[\s-]\d/i, // Destroyer (DDG-number)
  /^CVN[\s-]\d/i, // Carrier (CVN-number)
  /^CG[\s-]\d/i,  // Cruiser (CG-number)
  /^LHD[\s-]\d/i, // Amphibious (LHD-number)
  /^SSN[\s-]\d/i, // Submarine (SSN-number)
  /^FFG[\s-]\d/i, // Frigate (FFG-number)
  /^LCS[\s-]\d/i, // Littoral Combat Ship
  /^LPD[\s-]\d/i, // Amphibious transport dock
];

// Carrier strike group detection: clusters of military vessels
export interface StrikeGroupDetection {
  center: { lat: number; lon: number };
  vesselCount: number;
  vessels: string[]; // MMSIs
}

export function isMilitaryVessel(mmsi: string, aisShipType: number, vesselName: string): boolean {
  // Check AIS ship type
  if (MILITARY_AIS_TYPES.includes(aisShipType)) return true;

  // Check MMSI MID prefix (digits 1-3)
  const mid = mmsi.substring(0, 3);
  if (MILITARY_MMSI_MIDS[mid]) return true;

  // Check vessel name patterns
  const name = vesselName.trim();
  for (const pattern of MILITARY_NAME_PATTERNS) {
    if (pattern.test(name)) return true;
  }

  return false;
}

export function getMilitaryFlag(mmsi: string): string {
  const mid = mmsi.substring(0, 3);
  return MILITARY_MMSI_MIDS[mid] || '';
}

export function detectStrikeGroups(
  militaryVessels: { mmsi: string; lat: number; lon: number }[]
): StrikeGroupDetection[] {
  if (militaryVessels.length < 3) return [];

  const groups: StrikeGroupDetection[] = [];
  const used = new Set<string>();
  const CLUSTER_RADIUS_DEG = 0.5; // ~55km at equator

  for (const vessel of militaryVessels) {
    if (used.has(vessel.mmsi)) continue;

    const nearby = militaryVessels.filter(v =>
      !used.has(v.mmsi) &&
      Math.abs(v.lat - vessel.lat) < CLUSTER_RADIUS_DEG &&
      Math.abs(v.lon - vessel.lon) < CLUSTER_RADIUS_DEG
    );

    if (nearby.length >= 3) {
      const mmsis = nearby.map(v => v.mmsi);
      mmsis.forEach(m => used.add(m));
      const avgLat = nearby.reduce((s, v) => s + v.lat, 0) / nearby.length;
      const avgLon = nearby.reduce((s, v) => s + v.lon, 0) / nearby.length;
      groups.push({
        center: { lat: avgLat, lon: avgLon },
        vesselCount: nearby.length,
        vessels: mmsis,
      });
    }
  }

  return groups;
}
