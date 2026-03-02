export interface ConflictEvent {
  id: string;
  type: 'kinetic' | 'retaliation' | 'civilian_impact' | 'infrastructure' | 'escalation' | 'maritime';
  title: string;
  description: string;
  time: string; // ISO
  lat: number;
  lon: number;
  imageUrl?: string;
}

export const CONFLICT_EVENTS: ConflictEvent[] = [
  { id: 'K-001', type: 'kinetic', title: 'ZERO HOUR: ISFAHAN', time: '2025-06-14T07:05:00Z', lat: 32.65, lon: 51.68, description: 'Initial strikes on Isfahan Nuclear Technology Center' },
  { id: 'K-002', type: 'kinetic', title: 'KERMANSHAH WAVE', time: '2025-06-14T07:38:00Z', lat: 34.32, lon: 47.06, description: 'Second wave strikes on Kermanshah military installations' },
  { id: 'K-003', type: 'kinetic', title: 'BUSHEHR STRIKE REPORTS', time: '2025-06-14T07:42:00Z', lat: 28.98, lon: 50.82, description: 'Reports of strikes near Bushehr nuclear power plant' },
  { id: 'K-004', type: 'kinetic', title: 'QOM IMPACT REPORTS', time: '2025-06-14T07:33:00Z', lat: 34.64, lon: 50.88, description: 'Impact reports from Fordow facility near Qom' },
  { id: 'K-005', type: 'kinetic', title: 'TEHRAN STRIKE', time: '2025-06-14T07:22:00Z', lat: 35.70, lon: 51.40, description: 'Strikes on Parchin military complex near Tehran' },
  { id: 'K-006', type: 'kinetic', title: 'KHAUBAN COMPOUND', time: '2025-06-14T07:22:00Z', lat: 35.65, lon: 51.35, description: 'Strikes on IRGC compound in Tehran suburbs' },
  { id: 'M-001', type: 'maritime', title: 'HORMUZ BROADCAST', time: '2025-06-14T10:00:00Z', lat: 26.5, lon: 56.3, description: 'Maritime broadcast warning — Strait of Hormuz closure threat' },
  { id: 'K-007', type: 'kinetic', title: 'NATANZ PENETRATION', time: '2025-06-14T02:15:00Z', lat: 33.72, lon: 51.73, description: 'B-2 Spirit penetrating strike on Natanz enrichment facility' },
  { id: 'K-008', type: 'kinetic', title: 'SHAHRUD MISSILE SITE', time: '2025-06-14T02:22:00Z', lat: 35.24, lon: 52.35, description: 'Strikes on solid-fuel ballistic missile test facility' },
  { id: 'R-001', type: 'retaliation', title: 'IRGC BALLISTIC LAUNCH', time: '2025-06-14T09:00:00Z', lat: 33.49, lon: 48.35, description: 'IRGC launches Fateh-110 ballistic missiles toward US bases in Iraq' },
  { id: 'R-002', type: 'retaliation', title: 'HOUTHI CRUISE SALVO', time: '2025-06-14T11:00:00Z', lat: 15.35, lon: 44.21, description: 'Houthi cruise missile salvo targeting Red Sea shipping' },
  { id: 'C-001', type: 'civilian_impact', title: 'TEHRAN BLACKOUT', time: '2025-06-14T03:00:00Z', lat: 35.69, lon: 51.39, description: 'Tehran experiences total internet and power blackout' },
  { id: 'I-001', type: 'infrastructure', title: 'KHARG ISLAND FIRES', time: '2025-06-14T08:00:00Z', lat: 29.24, lon: 50.33, description: 'Fires reported at Kharg Island oil terminal' },
  { id: 'E-001', type: 'escalation', title: 'DEFCON 2 DECLARED', time: '2025-06-14T06:00:00Z', lat: 38.87, lon: -77.06, description: 'US Strategic Command elevates to DEFCON 2' },
];
