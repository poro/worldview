// ============================================
// GPS Interference Zone Data — Operation Epic Fury
// ============================================

export type GpsSeverity = 'minor' | 'moderate' | 'severe';

export interface GpsInterferenceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius_km: number;
  severity: GpsSeverity;
  type: 'jamming' | 'spoofing' | 'both';
  start_time: string; // ISO 8601
  end_time: string | null; // null = ongoing
  description: string;
  affected_systems: string[];
}

export const GPS_INTERFERENCE_ZONES: GpsInterferenceZone[] = [
  {
    id: 'GPS-001',
    name: 'Eastern Mediterranean Basin',
    lat: 34.0,
    lon: 34.0,
    radius_km: 500,
    severity: 'severe',
    type: 'spoofing',
    start_time: '2025-06-13T18:00:00Z',
    end_time: null,
    description: 'Widespread GPS spoofing across eastern Mediterranean affecting commercial aviation. Aircraft RNAV approaches unreliable. Multiple NOTAMs issued by Cyprus, Lebanon, Israel FIRs. Ships reporting AIS position jumps of 50+ nautical miles.',
    affected_systems: ['GPS L1/L2', 'GLONASS', 'Galileo'],
  },
  {
    id: 'GPS-002',
    name: 'Persian Gulf',
    lat: 27.0,
    lon: 51.0,
    radius_km: 300,
    severity: 'severe',
    type: 'both',
    start_time: '2025-06-14T01:00:00Z',
    end_time: null,
    description: 'Heavy GPS jamming and spoofing across the Persian Gulf coinciding with strike operations. IRGC electronic warfare units active. Commercial shipping relying on radar/visual navigation. Oil tanker AIS tracks showing erratic positions.',
    affected_systems: ['GPS L1/L2', 'GLONASS', 'Galileo', 'BeiDou'],
  },
  {
    id: 'GPS-003',
    name: 'Strait of Hormuz',
    lat: 26.5,
    lon: 56.5,
    radius_km: 200,
    severity: 'severe',
    type: 'jamming',
    start_time: '2025-06-14T01:30:00Z',
    end_time: null,
    description: 'Intense GPS denial zone in Strait of Hormuz chokepoint. IRGC coastal EW batteries jamming all GNSS frequencies. USN vessels operating on INS/TACAN backup. Multiple near-miss incidents reported by commercial vessels.',
    affected_systems: ['GPS L1/L2/L5', 'GLONASS', 'Galileo', 'BeiDou'],
  },
  {
    id: 'GPS-004',
    name: 'Iran Interior (Nationwide)',
    lat: 33.0,
    lon: 53.0,
    radius_km: 800,
    severity: 'moderate',
    type: 'jamming',
    start_time: '2025-06-14T02:00:00Z',
    end_time: null,
    description: 'Broad-area GPS disruption across Iranian airspace. Iranian military activating mobile jamming assets to degrade precision-guided munition accuracy. Effectiveness limited against military M-code GPS receivers.',
    affected_systems: ['GPS L1', 'GLONASS', 'Galileo'],
  },
  {
    id: 'GPS-005',
    name: 'Northern Iraq / Kurdistan Region',
    lat: 36.5,
    lon: 44.0,
    radius_km: 250,
    severity: 'minor',
    type: 'spoofing',
    start_time: '2025-06-14T04:00:00Z',
    end_time: null,
    description: 'GPS anomalies detected in northern Iraq, likely spillover from Iranian EW operations. Erbil International Airport reporting intermittent GPS issues. Coalition forces operating from bases in the region on backup nav systems.',
    affected_systems: ['GPS L1'],
  },
  {
    id: 'GPS-006',
    name: 'Gulf of Oman',
    lat: 24.5,
    lon: 59.0,
    radius_km: 350,
    severity: 'moderate',
    type: 'spoofing',
    start_time: '2025-06-14T03:00:00Z',
    end_time: null,
    description: 'GPS spoofing detected in Gulf of Oman affecting commercial shipping transiting to/from Strait of Hormuz. Vessels reporting false positions placing them on land. Attributed to IRGC Navy electronic warfare assets on Jask coast.',
    affected_systems: ['GPS L1', 'GLONASS'],
  },
];
