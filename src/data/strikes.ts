// ============================================
// Operation Epic Fury — Strike Coordinate Data
// ============================================

export interface StrikeRecord {
  id: string;
  lat: number;
  lon: number;
  time: string; // ISO 8601
  target_name: string;
  strike_type: 'air' | 'missile' | 'drone';
  source: string;
  description: string;
  blast_radius_m: number; // estimated blast radius in meters
}

export const STRIKES: StrikeRecord[] = [
  // ---- Nuclear / Enrichment Facilities ----
  {
    id: 'EF-001',
    lat: 33.7210,
    lon: 51.7275,
    time: '2025-06-14T02:15:00Z',
    target_name: 'Natanz Uranium Enrichment Facility',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'B-2 Spirit penetrating strike on underground centrifuge halls at Natanz FEP. Multiple GBU-57 MOP bunker busters employed against hardened targets buried 70+ feet underground.',
    blast_radius_m: 2000,
  },
  {
    id: 'EF-002',
    lat: 32.6520,
    lon: 51.6830,
    time: '2025-06-14T02:18:00Z',
    target_name: 'Isfahan Nuclear Technology Center',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'Strikes on the Isfahan UCF (Uranium Conversion Facility) and associated research reactors. Secondary explosions observed via infrared satellite.',
    blast_radius_m: 1500,
  },
  {
    id: 'EF-003',
    lat: 34.8800,
    lon: 51.5900,
    time: '2025-06-14T02:20:00Z',
    target_name: 'Fordow Fuel Enrichment Plant',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'Deep-penetration strike on Fordow facility built inside a mountain near Qom. Multiple sorties required against hardened tunnel entrances and ventilation shafts.',
    blast_radius_m: 1800,
  },
  {
    id: 'EF-004',
    lat: 35.5200,
    lon: 51.7700,
    time: '2025-06-14T02:25:00Z',
    target_name: 'Parchin Military Complex',
    strike_type: 'missile',
    source: 'OSINT / satellite imagery',
    description: 'Tomahawk cruise missile salvo targeting Parchin suspected weapons research site. Explosives testing chambers and associated buildings destroyed.',
    blast_radius_m: 1200,
  },
  {
    id: 'EF-005',
    lat: 28.8300,
    lon: 50.8800,
    time: '2025-06-14T03:00:00Z',
    target_name: 'Bushehr Nuclear Power Plant (perimeter)',
    strike_type: 'missile',
    source: 'OSINT / satellite imagery',
    description: 'Precision strikes on IRGC air defense positions and C2 nodes surrounding Bushehr NPP. Reactor dome itself not directly targeted per ROE.',
    blast_radius_m: 800,
  },

  // ---- Tehran Command & Control ----
  {
    id: 'EF-006',
    lat: 35.7000,
    lon: 51.4200,
    time: '2025-06-14T02:30:00Z',
    target_name: 'Supreme Leader Compound, Tehran',
    strike_type: 'air',
    source: 'OSINT / flight tracking',
    description: 'Strike package targeting leadership compound in northern Tehran. F-35I Adir aircraft employed with stand-off munitions.',
    blast_radius_m: 600,
  },
  {
    id: 'EF-007',
    lat: 35.6892,
    lon: 51.3890,
    time: '2025-06-14T02:32:00Z',
    target_name: 'IRGC Joint HQ, Tehran',
    strike_type: 'missile',
    source: 'OSINT / social media geolocated',
    description: 'Cruise missile strikes on IRGC joint headquarters complex. Command and control facility severely damaged per post-strike BDA.',
    blast_radius_m: 500,
  },
  {
    id: 'EF-008',
    lat: 35.7440,
    lon: 51.3760,
    time: '2025-06-14T02:35:00Z',
    target_name: 'Ministry of Defense, Tehran',
    strike_type: 'missile',
    source: 'OSINT / satellite imagery',
    description: 'JASSM-ER standoff missiles targeting MoD complex in western Tehran. Multiple buildings hit in the compound.',
    blast_radius_m: 700,
  },

  // ---- IRGC / Missile Sites ----
  {
    id: 'EF-009',
    lat: 35.2350,
    lon: 52.3450,
    time: '2025-06-14T02:22:00Z',
    target_name: 'Shahrud Missile Test Facility',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'Strikes on solid-fuel ballistic missile production and test facility at Shahrud. Launch pads and assembly buildings destroyed.',
    blast_radius_m: 1500,
  },
  {
    id: 'EF-010',
    lat: 33.4900,
    lon: 48.3500,
    time: '2025-06-14T02:40:00Z',
    target_name: 'Khorramabad IRGC Missile Base',
    strike_type: 'missile',
    source: 'OSINT / satellite imagery',
    description: 'Tomahawk strikes on underground missile storage facility in western Iran. IRGC Aerospace Force medium-range ballistic missile depot.',
    blast_radius_m: 1000,
  },
  {
    id: 'EF-011',
    lat: 36.2700,
    lon: 59.6100,
    time: '2025-06-14T02:45:00Z',
    target_name: 'Mashhad IRGC Air Base',
    strike_type: 'drone',
    source: 'OSINT / satellite imagery',
    description: 'MQ-9 Reaper and loitering munition strikes on IRGC-AF drone wing at Mashhad. Shahed-136 production and storage facilities hit.',
    blast_radius_m: 800,
  },
  {
    id: 'EF-012',
    lat: 27.1800,
    lon: 56.2700,
    time: '2025-06-14T02:50:00Z',
    target_name: 'Bandar Abbas Naval & Missile Complex',
    strike_type: 'air',
    source: 'OSINT / AIS tracking',
    description: 'Strikes on IRGC Navy fast-attack craft pens and anti-ship cruise missile batteries at Bandar Abbas overlooking Strait of Hormuz.',
    blast_radius_m: 1200,
  },

  // ---- Air Defense / Radar ----
  {
    id: 'EF-013',
    lat: 35.6900,
    lon: 51.3100,
    time: '2025-06-14T02:10:00Z',
    target_name: 'Tehran Khatam al-Anbiya AD Site',
    strike_type: 'missile',
    source: 'OSINT / ELINT',
    description: 'SEAD/DEAD opening salvo — AGM-88G AARGM-ER targeting S-300PMU2 battery and Bavar-373 long-range air defense system protecting Tehran.',
    blast_radius_m: 400,
  },
  {
    id: 'EF-014',
    lat: 32.8600,
    lon: 51.7100,
    time: '2025-06-14T02:12:00Z',
    target_name: 'Isfahan S-300 Battery',
    strike_type: 'missile',
    source: 'OSINT / ELINT',
    description: 'HARM anti-radiation missiles targeting Isfahan area IADS node. S-300 engagement radar and TEL vehicles destroyed.',
    blast_radius_m: 350,
  },
  {
    id: 'EF-015',
    lat: 29.4700,
    lon: 52.5900,
    time: '2025-06-14T02:14:00Z',
    target_name: 'Shiraz Air Defense Complex',
    strike_type: 'missile',
    source: 'OSINT / ELINT',
    description: 'Opening-phase DEAD strike on integrated air defense radar and C2 node at Shiraz. Enabled follow-on strike corridors into central Iran.',
    blast_radius_m: 400,
  },

  // ---- Second Wave ----
  {
    id: 'EF-016',
    lat: 34.3500,
    lon: 47.1500,
    time: '2025-06-14T06:00:00Z',
    target_name: 'Kermanshah IRGC Garrison',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'Second wave strikes on IRGC ground forces garrison and armored vehicle depot at Kermanshah near Iraqi border.',
    blast_radius_m: 900,
  },
  {
    id: 'EF-017',
    lat: 32.4000,
    lon: 53.6900,
    time: '2025-06-14T06:15:00Z',
    target_name: 'Tabas IRGC Underground Facility',
    strike_type: 'air',
    source: 'OSINT / satellite imagery',
    description: 'B-2 sortie targeting deep underground IRGC strategic reserve facility near Tabas. Previously identified via commercial SAR imagery.',
    blast_radius_m: 1500,
  },
  {
    id: 'EF-018',
    lat: 38.0800,
    lon: 46.2900,
    time: '2025-06-14T06:30:00Z',
    target_name: 'Tabriz Drone Production Plant',
    strike_type: 'drone',
    source: 'OSINT / satellite imagery',
    description: 'Loitering munition swarm on drone production facility at Tabriz. Shahed assembly line and component warehouses destroyed.',
    blast_radius_m: 700,
  },
];
