// ============================================
// Airspace Restriction Data — Operation Epic Fury
// ============================================

export type AirspaceStatus = 'closed' | 'restricted' | 'partial';

export interface AirspaceZone {
  id: string;
  country: string;
  status: AirspaceStatus;
  start_time: string; // ISO 8601
  end_time: string | null;
  notam_id: string;
  description: string;
  // Simplified polygon boundary [lon, lat][]
  boundary: [number, number][];
}

export const AIRSPACE_ZONES: AirspaceZone[] = [
  {
    id: 'AIR-001',
    country: 'Iran',
    status: 'closed',
    start_time: '2025-06-14T01:00:00Z',
    end_time: null,
    notam_id: 'A0147/25 OIIX',
    description: 'Total closure of Iranian airspace (Tehran FIR / OIIX). All civilian flights grounded. Overflights prohibited. IRGC has assumed control of ATC frequencies.',
    boundary: [
      [44.0, 39.8], [48.5, 39.6], [48.9, 38.4], [53.9, 37.3],
      [54.7, 37.5], [57.3, 38.2], [59.3, 37.5], [60.8, 36.6],
      [61.2, 35.1], [61.4, 34.0], [61.6, 31.5], [60.8, 29.8],
      [57.8, 25.6], [56.3, 26.2], [54.0, 26.6], [51.6, 27.6],
      [50.1, 28.8], [48.9, 29.4], [48.5, 30.5], [46.1, 32.0],
      [45.5, 33.9], [46.2, 35.8], [44.8, 37.0], [44.4, 38.3],
      [44.0, 39.8],
    ],
  },
  {
    id: 'AIR-002',
    country: 'Iraq',
    status: 'closed',
    start_time: '2025-06-14T01:30:00Z',
    end_time: null,
    notam_id: 'A0089/25 ORBB',
    description: 'Full closure of Iraqi airspace (Baghdad FIR / ORBB). US CENTCOM has declared the airspace an active combat zone. All civilian traffic diverted.',
    boundary: [
      [38.8, 37.4], [42.4, 37.1], [44.8, 37.0], [46.2, 35.8],
      [45.5, 33.9], [46.1, 32.0], [48.5, 30.5], [48.0, 29.5],
      [46.5, 29.4], [44.7, 29.1], [43.0, 28.0], [40.0, 30.5],
      [38.8, 33.4], [38.8, 37.4],
    ],
  },
  {
    id: 'AIR-003',
    country: 'Syria',
    status: 'closed',
    start_time: '2025-06-14T02:00:00Z',
    end_time: null,
    notam_id: 'A0034/25 OSTT',
    description: 'Syrian airspace closed (Damascus FIR / OSTT). Russian and Syrian air defense systems on high alert. Risk of misidentification.',
    boundary: [
      [35.7, 36.8], [36.8, 37.1], [38.8, 37.4], [38.8, 33.4],
      [40.0, 30.5], [39.0, 32.3], [36.0, 33.8], [36.1, 34.6],
      [35.8, 35.0], [35.5, 35.6], [35.7, 36.8],
    ],
  },
  {
    id: 'AIR-004',
    country: 'Kuwait',
    status: 'restricted',
    start_time: '2025-06-14T02:00:00Z',
    end_time: null,
    notam_id: 'A0012/25 OKAC',
    description: 'Kuwaiti airspace restricted to military operations only. Kuwait IAP closed to civilian traffic. Coalition aircraft transit corridor established.',
    boundary: [
      [46.5, 30.1], [48.4, 30.1], [48.5, 28.5], [47.9, 28.5],
      [46.5, 29.4], [46.5, 30.1],
    ],
  },
  {
    id: 'AIR-005',
    country: 'Jordan',
    status: 'partial',
    start_time: '2025-06-14T02:30:00Z',
    end_time: null,
    notam_id: 'A0056/25 OJAC',
    description: 'Eastern Jordanian airspace (east of E39°) restricted. Western Jordan airways open with tactical rerouting. Amman FIR issuing real-time slot restrictions.',
    boundary: [
      [35.0, 33.4], [39.0, 33.4], [39.0, 32.3], [39.3, 29.3],
      [35.5, 29.2], [35.0, 30.0], [35.5, 31.5], [35.0, 33.4],
    ],
  },
  {
    id: 'AIR-006',
    country: 'Israel',
    status: 'restricted',
    start_time: '2025-06-14T01:00:00Z',
    end_time: null,
    notam_id: 'A0201/25 LLLL',
    description: 'Israeli airspace under military control. Ben Gurion Airport closed to civilian traffic. Iron Dome / Arrow-3 systems fully active. GPS-dependent approaches suspended.',
    boundary: [
      [34.2, 33.3], [35.7, 33.3], [35.5, 31.5], [35.0, 30.0],
      [34.9, 29.5], [34.2, 29.5], [34.2, 33.3],
    ],
  },
  {
    id: 'AIR-007',
    country: 'Lebanon',
    status: 'restricted',
    start_time: '2025-06-14T02:00:00Z',
    end_time: null,
    notam_id: 'A0018/25 OLBB',
    description: 'Lebanese airspace restricted. Beirut Rafic Hariri International operating under emergency procedures only. IDF aircraft transit reported.',
    boundary: [
      [35.1, 34.7], [36.6, 34.7], [36.6, 33.1], [35.1, 33.1],
      [35.1, 34.7],
    ],
  },
  {
    id: 'AIR-008',
    country: 'Bahrain',
    status: 'restricted',
    start_time: '2025-06-14T02:00:00Z',
    end_time: null,
    notam_id: 'A0008/25 OBBB',
    description: 'Bahrain airspace restricted. US Fifth Fleet at NSA Bahrain on THREATCON DELTA. BAH IAP limited to military and emergency medical.',
    boundary: [
      [50.3, 26.4], [50.8, 26.4], [50.8, 25.8], [50.3, 25.8],
      [50.3, 26.4],
    ],
  },
  {
    id: 'AIR-009',
    country: 'Saudi Arabia (Northern)',
    status: 'restricted',
    start_time: '2025-06-14T03:00:00Z',
    end_time: null,
    notam_id: 'A0077/25 OEJD',
    description: 'Northern Saudi airspace (north of N28°) restricted. Patriot and THAAD batteries active along northern border. Civilian overflights rerouted via southern corridors.',
    boundary: [
      [36.5, 32.0], [43.0, 32.0], [46.5, 29.4], [47.9, 28.5],
      [50.2, 28.0], [51.6, 27.6], [50.1, 28.0], [48.0, 28.0],
      [43.0, 28.0], [39.3, 29.3], [36.5, 29.0], [36.5, 32.0],
    ],
  },
];
