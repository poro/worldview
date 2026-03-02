// ============================================
// Shipping Lane Data — Operation Epic Fury
// ============================================

export type LaneStatus = 'open' | 'delayed' | 'blocked';

export interface ShippingLane {
  id: string;
  name: string;
  status: LaneStatus;
  // Waypoints as [lon, lat] pairs defining the lane centerline
  waypoints: [number, number][];
  width_km: number;
  daily_vessel_count: number;
  description: string;
  start_time: string; // ISO 8601 — when status changed
}

export interface Chokepoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: LaneStatus;
  daily_vessel_count: number;
  oil_throughput_mbpd: number; // million barrels per day
  description: string;
}

export const SHIPPING_LANES: ShippingLane[] = [
  {
    id: 'LANE-001',
    name: 'Strait of Hormuz — Inbound (Eastbound)',
    status: 'blocked',
    waypoints: [
      [56.0, 26.2], [56.2, 26.4], [56.4, 26.5], [56.6, 26.6],
      [56.8, 26.6], [57.0, 26.5], [57.2, 26.4], [57.5, 26.3],
    ],
    width_km: 10,
    daily_vessel_count: 0,
    description: 'Inbound (westbound into Gulf) traffic separation lane through Strait of Hormuz. BLOCKED — IRGC has deployed sea mines and fast attack craft. USN mine countermeasure operations underway.',
    start_time: '2025-06-14T04:00:00Z',
  },
  {
    id: 'LANE-002',
    name: 'Strait of Hormuz — Outbound (Westbound)',
    status: 'blocked',
    waypoints: [
      [57.5, 26.1], [57.2, 26.2], [57.0, 26.3], [56.8, 26.4],
      [56.6, 26.4], [56.4, 26.3], [56.2, 26.2], [56.0, 26.0],
    ],
    width_km: 10,
    daily_vessel_count: 0,
    description: 'Outbound (eastbound out of Gulf) traffic separation lane. BLOCKED — oil tanker traffic halted. Lloyd\'s of London has suspended hull insurance for Hormuz transit.',
    start_time: '2025-06-14T04:00:00Z',
  },
  {
    id: 'LANE-003',
    name: 'Persian Gulf — North-South Corridor',
    status: 'delayed',
    waypoints: [
      [50.5, 29.0], [50.8, 28.5], [51.2, 28.0], [51.5, 27.5],
      [52.0, 27.0], [53.0, 26.5], [54.5, 26.3], [56.0, 26.2],
    ],
    width_km: 20,
    daily_vessel_count: 35,
    description: 'Main north-south shipping corridor through Persian Gulf from Kuwait/Iraq oil terminals toward Hormuz. DELAYED — vessels anchoring in place awaiting Hormuz clearance. Convoy system being organized by CMF.',
    start_time: '2025-06-14T05:00:00Z',
  },
  {
    id: 'LANE-004',
    name: 'Gulf of Oman — Approach',
    status: 'delayed',
    waypoints: [
      [57.5, 26.3], [58.0, 25.8], [59.0, 25.0], [60.0, 24.5],
      [61.0, 24.0], [62.0, 23.5],
    ],
    width_km: 30,
    daily_vessel_count: 45,
    description: 'Gulf of Oman approach to Strait of Hormuz. DELAYED — vessels holding position in Gulf of Oman. IRGC fast boat activity and mine threat warnings in effect.',
    start_time: '2025-06-14T04:30:00Z',
  },
  {
    id: 'LANE-005',
    name: 'Bab el-Mandeb — Red Sea Transit',
    status: 'delayed',
    waypoints: [
      [43.3, 12.5], [43.4, 12.6], [43.5, 12.8], [43.4, 13.0],
      [43.2, 13.5], [42.8, 14.0], [42.5, 15.0], [41.5, 17.0],
      [40.0, 20.0], [38.5, 23.0], [36.0, 27.0],
    ],
    width_km: 15,
    daily_vessel_count: 55,
    description: 'Bab el-Mandeb strait and Red Sea northbound transit lane. DELAYED — Houthi threats intensified as Iranian proxy retaliation. US/UK naval escorts required. Insurance premiums spiked 300%.',
    start_time: '2025-06-14T06:00:00Z',
  },
  {
    id: 'LANE-006',
    name: 'Suez Canal Transit',
    status: 'open',
    waypoints: [
      [32.3, 30.0], [32.3, 30.2], [32.4, 30.4], [32.5, 30.6],
      [32.5, 30.8], [32.6, 31.0], [32.6, 31.3],
    ],
    width_km: 1,
    daily_vessel_count: 40,
    description: 'Suez Canal transit corridor. OPEN — operating under enhanced security. Egyptian Navy has increased patrol frequency. Southbound traffic facing delays due to Red Sea situation.',
    start_time: '2025-06-14T00:00:00Z',
  },
];

export const CHOKEPOINTS: Chokepoint[] = [
  {
    id: 'CP-001',
    name: 'Strait of Hormuz',
    lat: 26.5,
    lon: 56.5,
    status: 'blocked',
    daily_vessel_count: 0,
    oil_throughput_mbpd: 0,
    description: 'World\'s most critical oil chokepoint. Normally ~21 MBPD (≈20% of global supply). Currently BLOCKED by IRGC mine and fast-boat operations. Oil prices surged past $130/barrel.',
  },
  {
    id: 'CP-002',
    name: 'Bab el-Mandeb',
    lat: 12.6,
    lon: 43.3,
    status: 'delayed',
    daily_vessel_count: 55,
    oil_throughput_mbpd: 4.8,
    description: 'Southern Red Sea chokepoint connecting to Gulf of Aden. Houthi militia escalating attacks in coordination with Iranian retaliation. USN destroyer providing escort.',
  },
  {
    id: 'CP-003',
    name: 'Suez Canal',
    lat: 30.5,
    lon: 32.4,
    status: 'open',
    daily_vessel_count: 40,
    oil_throughput_mbpd: 5.5,
    description: 'Egyptian-controlled canal. Operating normally but southbound vessels facing diversion options due to Bab el-Mandeb threat. Suez Canal Authority on heightened alert.',
  },
];
