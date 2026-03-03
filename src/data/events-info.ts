// ============================================================
// Information Events — Timeline entries for The Feed
// Follows the pattern in src/data/events.ts
// ============================================================

import type { InfoEventType } from '../feed/types';

export interface InfoEvent {
  id: string;
  type: InfoEventType;
  title: string;
  description: string;
  time: string; // ISO
  lat: number;
  lon: number;
}

export const INFO_EVENTS: InfoEvent[] = [
  // --- Day 1: Feb 28 — Claims emerge with strikes ---
  { id: 'INFO-001', type: 'disinfo_state', title: 'IRNA: ISFAHAN "CHEMICAL PLANT" COVER STORY', time: '2026-02-28T02:20:00Z', lat: 35.69, lon: 51.39, description: 'Iranian state media publishes fabricated cover story claiming Isfahan explosions are industrial accidents at a chemical plant' },
  { id: 'INFO-002', type: 'verification', title: 'DOD CONFIRMS NUCLEAR STRIKES', time: '2026-02-28T03:00:00Z', lat: 38.87, lon: -77.06, description: 'Pentagon releases official statement confirming precision strikes on four Iranian nuclear facilities' },
  { id: 'INFO-003', type: 'verification', title: 'AL JAZEERA INDEPENDENT CONFIRMATION', time: '2026-02-28T02:45:00Z', lat: 25.29, lon: 51.53, description: 'Al Jazeera correspondents independently confirm multiple explosions near known nuclear sites' },
  { id: 'INFO-004', type: 'disinfo_state', title: 'IRGC CLAIMS 80% INTERCEPT RATE', time: '2026-02-28T04:30:00Z', lat: 35.69, lon: 51.39, description: 'IRGC releases fabricated air defense success video — actually footage from 2024 drill' },
  { id: 'INFO-005', type: 'disinfo_state', title: 'IRAN FM: FORDOW "PEACEFUL RESEARCH"', time: '2026-02-28T05:00:00Z', lat: 35.69, lon: 51.39, description: 'Iranian Foreign Ministry claims Fordow was civilian research — IAEA confirms 60% enrichment' },
  { id: 'INFO-006', type: 'misinfo_organic', title: 'FALSE: US MARINES LANDING AT BANDAR ABBAS', time: '2026-02-28T05:30:00Z', lat: 27.18, lon: 56.27, description: 'Unverified Telegram rumor of US ground invasion goes viral — Pentagon denies' },
  { id: 'INFO-007', type: 'deepfake', title: 'DEEPFAKE: IRGC COMMANDER SURRENDER VIDEO', time: '2026-02-28T06:15:00Z', lat: 32.09, lon: 34.78, description: 'AI-generated video of IRGC general announcing ceasefire circulates on Telegram — debunked within hours' },
  { id: 'INFO-008', type: 'disinfo_proxy', title: 'RT: "WESTERN AGGRESSION MIRRORS IRAQ 2003"', time: '2026-02-28T06:00:00Z', lat: 55.76, lon: 37.62, description: 'Russia Today runs special comparing Iran strikes to Iraq WMD narrative' },
  { id: 'INFO-009', type: 'disinfo_amplified', title: '#STOPIRANGENOCIDE BOT SWARM', time: '2026-02-28T06:30:00Z', lat: 35.69, lon: 51.39, description: 'Hashtag campaign with 60% bot amplification trends globally within 4 hours' },
  { id: 'INFO-010', type: 'misinfo_outdated', title: 'BEIRUT 2020 FOOTAGE PASSED AS TEHRAN', time: '2026-02-28T08:42:00Z', lat: 34.05, lon: -118.24, description: 'Viral video of massive explosion is actually Beirut port 2020 — shared as Tehran strike' },
  { id: 'INFO-011', type: 'verification', title: 'KHAMENEI ASSASSINATION LEAK', time: '2026-02-28T08:00:00Z', lat: 32.09, lon: 34.78, description: 'Israeli Channel 12 reports senior Iranian leadership killed — later confirmed as Supreme Leader' },
  { id: 'INFO-012', type: 'correction', title: 'BBC RETRACTS CASUALTY FIGURES', time: '2026-02-28T10:00:00Z', lat: 51.51, lon: -0.13, description: 'BBC issues correction after citing unverified Iranian state media casualty numbers' },

  // --- Day 2: Mar 1 — Escalation in info domain ---
  { id: 'INFO-013', type: 'disinfo_state', title: 'HORMUZ MINE THREAT EXAGGERATED', time: '2026-03-01T08:00:00Z', lat: 27.18, lon: 56.27, description: 'IRGC Navy claims full Hormuz mining — US minesweepers find limited deployment' },
  { id: 'INFO-014', type: 'disinfo_state', title: 'HOSPITAL TARGETING NARRATIVE', time: '2026-03-01T10:30:00Z', lat: 32.68, lon: 51.67, description: 'Iran claims US deliberately targeted Al Zahra Hospital — actually collateral damage' },
  { id: 'INFO-015', type: 'media_blackout', title: 'IRAN NATIONAL INTERNET KILL SWITCH', time: '2026-03-01T18:00:00Z', lat: 35.72, lon: 51.42, description: 'Iranian authorities activate nationwide internet shutdown — total information blackout' },
  { id: 'INFO-016', type: 'satire_misread', title: 'ONION ARTICLE SHARED AS REAL', time: '2026-03-01T14:00:00Z', lat: 41.88, lon: -87.63, description: 'Satirical article about "morally sentient weapons" goes viral as genuine outrage' },

  // --- Day 3: Mar 2 — Narrative consolidation ---
  { id: 'INFO-017', type: 'narrative_shift', title: 'DOMINANT NARRATIVE SHIFTS TO COALITION', time: '2026-03-02T06:00:00Z', lat: 40.75, lon: -73.97, description: 'International media consensus shifts to precision-strike narrative as satellite imagery confirms targets' },
];
