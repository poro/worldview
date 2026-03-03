import type { InfoEventType } from '../feed/types';

export type ConflictEventType =
  | 'kinetic' | 'retaliation' | 'civilian_impact' | 'infrastructure'
  | 'escalation' | 'maritime' | 'intelligence' | 'cyber'
  | InfoEventType;

export interface ConflictEvent {
  id: string;
  type: ConflictEventType;
  title: string;
  description: string;
  time: string; // ISO
  lat: number;
  lon: number;
  imageUrl?: string;
  global?: boolean; // If true, shown in global ticker instead of geo-anchored
}

export const CONFLICT_EVENTS: ConflictEvent[] = [

  // ============ PRE-WAR INTELLIGENCE PREPARATION ============

  { id: 'I-PRE-001', type: 'intelligence', title: 'MOSSAD IRAN PRIORITY DIRECTIVE', time: '2001-03-01T00:00:00Z', lat: 32.07, lon: 34.78, description: 'PM Ariel Sharon directs Mossad leadership to prioritize Iran as primary strategic threat — initiates decades-long intelligence buildup' },
  { id: 'I-PRE-002', type: 'intelligence', title: 'TEHRAN CAMERA NETWORK COMPROMISED', time: '2022-01-15T00:00:00Z', lat: 35.70, lon: 51.42, description: 'Unit 8200 operatives hack traffic cameras across Tehran — years-long pattern-of-life surveillance begins on high-security compounds near Pasteur Street' },
  { id: 'I-PRE-003', type: 'intelligence', title: 'OCT 7 CALCULUS SHIFT', time: '2023-10-07T06:30:00Z', lat: 31.50, lon: 34.47, description: 'Hamas attack reshapes Israeli thinking — foreign heads of state no longer off-limits in wartime. Iran identified as ultimate sponsor.' },
  { id: 'I-PRE-004', type: 'intelligence', title: 'PATTERN OF LIFE COMPLETE', time: '2025-12-01T00:00:00Z', lat: 35.70, lon: 51.42, description: 'Unit 8200 + Mossad complete "pattern of life" analysis on Supreme Leader compound: bodyguard parking locations, daily routines, addresses, routes, schedules, protection assignments mapped via algorithm-processed camera data' },

  // ============ H-HOUR MINUS — Cyber & Electronic Warfare ============

  { id: 'CY-001', type: 'cyber', title: 'US CYBER OPS — RADAR DISRUPTION', time: '2026-02-28T01:30:00Z', lat: 35.69, lon: 51.31, description: 'US cyber operations disrupt Iranian radar and communication capabilities across Tehran air defense network' },
  { id: 'CY-002', type: 'cyber', title: 'CELL TOWER JAMMING — PASTEUR ST', time: '2026-02-28T01:45:00Z', lat: 35.6985, lon: 51.4215, description: 'Israeli intelligence activates interference on mobile phone tower components near Pasteur Street, Tehran — calls appear busy, security teams cannot receive warnings' },
  { id: 'I-PRE-005', type: 'intelligence', title: 'HUMINT CONFIRMATION — MEETING ACTIVE', time: '2026-02-28T02:00:00Z', lat: 35.70, lon: 51.42, description: 'US intelligence asset (human source) confirms high-level meeting underway at Khamenei compound — Israeli doctrine requires double verification by senior officers before authorization' },

  // ============ DAY 1 — Feb 28, 2026 (H-Hour + Initial Strikes) ============

  { id: 'E-001', type: 'escalation', title: 'DEFCON 2 DECLARED', time: '2026-02-28T01:00:00Z', lat: 38.87, lon: -77.06, description: 'US Strategic Command elevates to DEFCON 2 — highest peacetime alert level', global: true },
  { id: 'K-001', type: 'kinetic', title: 'SEAD OPENING SALVO', time: '2026-02-28T02:10:00Z', lat: 35.69, lon: 51.31, description: 'AGM-88G AARGM-ER targeting S-300PMU2 battery and Bavar-373 protecting Tehran' },
  { id: 'K-002', type: 'kinetic', title: 'NATANZ PENETRATION', time: '2026-02-28T02:15:00Z', lat: 33.72, lon: 51.73, description: 'B-2 Spirit penetrating strike on Natanz enrichment facility — GBU-57 MOP bunker busters' },
  { id: 'K-003', type: 'kinetic', title: 'ISFAHAN NUCLEAR CENTER', time: '2026-02-28T02:18:00Z', lat: 32.65, lon: 51.68, description: 'Strikes on Isfahan UCF — secondary explosions observed via infrared satellite' },
  { id: 'K-004', type: 'kinetic', title: 'FORDOW DEEP STRIKE', time: '2026-02-28T02:20:00Z', lat: 34.88, lon: 51.59, description: 'Deep-penetration strike on Fordow facility built inside mountain near Qom' },
  { id: 'K-005', type: 'kinetic', title: 'SHAHRUD MISSILE SITE', time: '2026-02-28T02:22:00Z', lat: 35.24, lon: 52.35, description: 'Strikes on solid-fuel ballistic missile test facility — launch pads destroyed' },
  { id: 'K-006', type: 'kinetic', title: 'PARCHIN COMPLEX', time: '2026-02-28T02:25:00Z', lat: 35.52, lon: 51.77, description: 'Tomahawk cruise missile salvo on Parchin suspected weapons research site' },
  { id: 'K-007', type: 'kinetic', title: 'OPERATION ROARING LION — SUPREME LEADER KILLED', time: '2026-02-28T02:30:00Z', lat: 35.70, lon: 51.42, description: 'Israeli F-35I Adir strike package releases precision-guided munitions on Khamenei compound during daylight (local) — timing chosen for tactical surprise as adversary expected night ops. HUMINT confirmed meeting in progress. Cell towers jammed, radar suppressed. Years of pattern-of-life surveillance via compromised traffic cameras enabled targeting. Double verification by senior officers completed. Supreme Leader Ali Khamenei killed.' },
  { id: 'K-008', type: 'kinetic', title: 'BANDAR ABBAS NAVAL', time: '2026-02-28T02:50:00Z', lat: 27.18, lon: 56.27, description: 'Strikes on IRGC Navy fast-attack craft pens and anti-ship cruise missile batteries' },
  { id: 'C-001', type: 'civilian_impact', title: 'TEHRAN BLACKOUT', time: '2026-02-28T03:00:00Z', lat: 35.69, lon: 51.39, description: 'Tehran experiences total internet and power blackout — 15M affected' },
  { id: 'K-009', type: 'kinetic', title: 'BUSHEHR PERIMETER', time: '2026-02-28T03:00:00Z', lat: 28.83, lon: 50.88, description: 'Precision strikes on IRGC air defense positions surrounding Bushehr NPP' },
  { id: 'K-010', type: 'kinetic', title: 'KERMANSHAH WAVE', time: '2026-02-28T06:00:00Z', lat: 34.35, lon: 47.15, description: 'Second wave strikes on IRGC ground forces garrison at Kermanshah' },
  { id: 'K-011', type: 'kinetic', title: 'TABAS UNDERGROUND', time: '2026-02-28T06:15:00Z', lat: 32.40, lon: 53.69, description: 'B-2 sortie targeting deep underground IRGC strategic reserve facility near Tabas' },
  { id: 'K-012', type: 'kinetic', title: 'TABRIZ DRONE PLANT', time: '2026-02-28T06:30:00Z', lat: 38.08, lon: 46.29, description: 'Loitering munition swarm destroys Shahed assembly line at Tabriz' },
  { id: 'I-001', type: 'infrastructure', title: 'KHARG ISLAND FIRES', time: '2026-02-28T08:00:00Z', lat: 29.24, lon: 50.33, description: 'Fires reported at Kharg Island oil terminal — 90% of Iran crude exports transit here' },

  // ============ DAY 2 — Mar 1, 2026 (Retaliation + Maritime) ============

  { id: 'R-001', type: 'retaliation', title: 'IRGC BALLISTIC LAUNCH', time: '2026-03-01T04:00:00Z', lat: 33.49, lon: 48.35, description: 'IRGC launches Fateh-110 and Emad ballistic missiles toward US bases in Iraq' },
  { id: 'R-002', type: 'retaliation', title: 'HOUTHI CRUISE SALVO', time: '2026-03-01T06:00:00Z', lat: 15.35, lon: 44.21, description: 'Houthi cruise missile salvo targeting Red Sea shipping — 3 cargo vessels hit' },
  { id: 'M-001', type: 'maritime', title: 'HORMUZ CLOSURE THREAT', time: '2026-03-01T08:00:00Z', lat: 26.5, lon: 56.3, description: 'IRGC Navy broadcasts Strait of Hormuz closure — mines detected in shipping lane', global: true },
  { id: 'C-002', type: 'civilian_impact', title: 'ISFAHAN HOSPITAL DAMAGE', time: '2026-03-01T10:00:00Z', lat: 32.68, lon: 51.67, description: 'Al Zahra Hospital reports structural damage from nearby strikes — 200+ casualties' },
  { id: 'M-002', type: 'maritime', title: 'USS EISENHOWER TRANSIT', time: '2026-03-01T12:00:00Z', lat: 25.0, lon: 56.5, description: 'CVN-69 Eisenhower CSG enters Arabian Sea — surge force joins Lincoln CSG' },
  { id: 'R-003', type: 'retaliation', title: 'HEZBOLLAH ROCKET BARRAGE', time: '2026-03-01T14:00:00Z', lat: 33.27, lon: 35.20, description: 'Hezbollah launches 200+ rockets at northern Israel from southern Lebanon' },
  { id: 'I-002', type: 'infrastructure', title: 'ABADAN REFINERY FIRE', time: '2026-03-01T16:00:00Z', lat: 30.35, lon: 48.30, description: 'Abadan oil refinery complex engulfed in flames after secondary strikes' },
  { id: 'C-003', type: 'civilian_impact', title: 'IRAN INTERNET KILL SWITCH', time: '2026-03-01T18:00:00Z', lat: 35.72, lon: 51.42, description: 'Iranian authorities activate nationwide internet kill switch — total communications blackout' },

  // ============ DAY 3 — Mar 2, 2026 (Escalation + Continued Ops) ============

  { id: 'K-013', type: 'kinetic', title: 'MASHHAD DRONE BASE', time: '2026-03-02T02:00:00Z', lat: 36.27, lon: 59.61, description: 'MQ-9 Reaper strikes on IRGC-AF drone wing — Shahed-136 storage destroyed' },
  { id: 'E-002', type: 'escalation', title: 'F-15E CRASH — ZAGROS', time: '2026-03-02T05:30:00Z', lat: 33.90, lon: 48.80, description: 'USAF F-15E Strike Eagle down over Zagros Mountains — crew status unknown, CSAR launched' },
  { id: 'R-004', type: 'retaliation', title: 'IRGC DRONE SWARM', time: '2026-03-02T08:00:00Z', lat: 29.00, lon: 50.50, description: 'IRGC launches Shahed-136 drone swarm toward Al Udeid Air Base, Qatar' },
  { id: 'E-003', type: 'escalation', title: 'RUSSIA WARNS ESCALATION', time: '2026-03-02T10:00:00Z', lat: 55.75, lon: 37.62, description: 'Russian Foreign Ministry warns of "catastrophic consequences" — nuclear forces on alert', global: true },
  { id: 'M-003', type: 'maritime', title: 'TANKER STRUCK — GOO', time: '2026-03-02T12:00:00Z', lat: 26.20, lon: 56.10, description: 'Greek-flagged VLCC struck by anti-ship missile in Gulf of Oman — crew evacuating' },
  { id: 'I-003', type: 'infrastructure', title: 'UNDERSEA CABLE SEVERED', time: '2026-03-02T14:00:00Z', lat: 26.00, lon: 56.00, description: 'AAE-1 and FLAG undersea fiber cables severed near Fujairah — Gulf comms degraded' },
  { id: 'E-004', type: 'escalation', title: 'UN EMERGENCY SESSION', time: '2026-03-02T16:00:00Z', lat: 40.75, lon: -73.97, description: 'UN Security Council convenes emergency session — China and Russia block ceasefire resolution', global: true },
];
