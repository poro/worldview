# The Feed — WorldView Integration Spec

**Version:** 1.0 (March 3, 2026)
**Status:** Spec — Ready for Implementation
**Author:** Mark Ollila
**Depends on:** WorldView PRD v2.0, The Feed GDD v1.0
**Target:** WorldView codebase (`src/feed/`)

---

## 1. Overview

The Feed is an **information environment layer** for WorldView. It renders the information domain — news articles, social media claims, disinformation campaigns, bot networks, and narrative propagation — as geospatially anchored data on the 3D globe, running in parallel with existing kinetic/military/OSINT layers.

The core concept: WorldView shows **what's actually happening**. The Feed shows **what people are being told is happening**. The gap between ground truth and reported reality is the information warfare battlespace.

### 1.1 What Gets Built

| Component | Description | New Files |
|---|---|---|
| **Information Events** | New event types for the timeline system | `src/data/events-info.ts` |
| **Claim Entities** | Geolocated information claims with source chains | `src/feed/types.ts` |
| **Propagation Renderer** | Animated ripple/wave visualization of information spread | `src/feed/propagation.ts` |
| **Source Network Graph** | Bot network and amplification visualization | `src/feed/network.ts` |
| **Narrative Tracker** | Competing narrative threads tied to the same event | `src/feed/narratives.ts` |
| **Information Fog Overlay** | Degraded-information-environment visual effect | `src/feed/fog.ts` |
| **Verification Workbench** | Split-panel claim investigation UI | `src/feed/workbench.ts` |
| **Credibility HUD** | Scoring overlay for educational/game mode | `src/feed/scoring.ts` |
| **Feed UI Panel** | Right-panel feed of claims (scrollable, filterable) | `src/ui/feed-panel.ts` |
| **Feed Layer Controls** | Toggle switches in existing controls UI | Update `src/ui/controls.ts` |

### 1.2 Design Principles

1. **Additive, not invasive** — The Feed is a new layer system. It does not modify existing flight, satellite, maritime, or strike code. It hooks into the existing timeline controller, event system, and overlay renderer.
2. **Same patterns** — Follows WorldView's existing architecture: TypeScript modules, Cesium entity management, timeline data adapter, HTML overlay cards.
3. **Scenario-driven** — All Feed data is scenario-specific. The initial implementation ties to Operation Epic Fury. The data structure supports arbitrary scenarios via the planned custom scenario editor.
4. **Dual-mode** — Works as both a passive analysis layer (OSINT analyst mode) and an interactive educational layer (game mode with scoring).

---

## 2. Data Structures

### 2.1 Core Types — `src/feed/types.ts`

```typescript
// ============================================================
// INFORMATION EVENT TYPES
// ============================================================

/**
 * Information domain event types — extend the existing EventType union.
 * These render on the same timeline as kinetic/cyber/maritime events
 * but with distinct colors and iconography.
 */
export type InfoEventType =
  | 'disinfo_state'        // State-sponsored disinformation
  | 'disinfo_proxy'        // Proxy/cutout disinformation (state-adjacent)
  | 'disinfo_amplified'    // Bot network / coordinated inauthentic amplification
  | 'misinfo_organic'      // Genuine misunderstanding spreading virally
  | 'misinfo_outdated'     // Old content recirculated as current
  | 'narrative_shift'      // Dominant narrative changes
  | 'media_blackout'       // Information void — no reporting from region
  | 'deepfake'             // AI-generated synthetic media
  | 'satire_misread'       // Satirical content shared as real
  | 'correction'           // Official correction or retraction
  | 'verification'         // Independent fact-check published

/**
 * Timeline color mapping for info events.
 * Follows the existing pattern in src/data/events.ts
 */
export const INFO_EVENT_COLORS: Record<InfoEventType, string> = {
  disinfo_state:     '#E91E63',  // Hot pink — hostile state action
  disinfo_proxy:     '#AD1457',  // Dark pink — proxy ops
  disinfo_amplified: '#FF6F00',  // Amber — amplification networks
  misinfo_organic:   '#FFC107',  // Yellow — unintentional spread
  misinfo_outdated:  '#FFD54F',  // Light yellow — stale content
  narrative_shift:   '#7C4DFF',  // Deep purple — narrative change
  media_blackout:    '#37474F',  // Dark gray — information void
  deepfake:          '#D500F9',  // Magenta — synthetic media
  satire_misread:    '#00BCD4',  // Teal — misunderstood humor
  correction:        '#4CAF50',  // Green — correction issued
  verification:      '#2E7D32',  // Dark green — verified fact-check
};

// ============================================================
// CLAIM — The atomic unit of The Feed
// ============================================================

/**
 * A Claim is a single piece of information content — a news article,
 * social media post, video clip, or broadcast segment — geolocated
 * to its origin and tied to one or more ground-truth events.
 */
export interface Claim {
  id: string;                          // Unique claim ID: 'CLM-001', 'CLM-002', etc.
  scenarioId: string;                  // Parent scenario: 'epic-fury', 'pandemic-x', etc.

  // --- Content ---
  headline: string;                    // Primary claim text (rendered in feed panel + card)
  body: string;                        // Expanded claim text (rendered in workbench)
  mediaType: ClaimMediaType;           // Type of media carrying the claim
  mediaUrl?: string;                   // Optional screenshot/thumbnail path (local asset)

  // --- Classification ---
  infoEventType: InfoEventType;        // What kind of information event this is
  misinfoTaxonomy: MisinfoCategory[];  // Detailed taxonomy tags (can have multiple)
  truthScore: number;                  // 0–100 ground truth accuracy score
  severityTier: SeverityTier;          // How dangerous this claim is if believed

  // --- Geospatial ---
  origin: GeoCoord;                    // Where the claim was created/first published
  targetLocation?: GeoCoord;           // What location the claim is ABOUT (may differ from origin)
  propagationRadius: number;           // Km — how far the claim has spread (grows over time)

  // --- Temporal ---
  timestamp: string;                   // ISO 8601 — when the claim first appeared
  peakTimestamp?: string;              // ISO 8601 — when the claim reached max virality
  decayTimestamp?: string;             // ISO 8601 — when the claim started losing traction
  correctionTimestamp?: string;        // ISO 8601 — when a correction was issued (if ever)

  // --- Source Chain ---
  source: ClaimSource;                 // Original source of the claim
  amplifiers: ClaimAmplifier[];        // Accounts/networks that boosted the claim
  linkedGroundTruthEventId?: string;   // ID of the real WorldView event this relates to

  // --- Propagation ---
  propagation: PropagationProfile;     // How the claim spreads
  reach: ReachMetrics;                 // Audience/engagement numbers

  // --- Verification ---
  verificationStatus: VerificationStatus;
  groundTruthSummary: string;          // What actually happened (shown after investigation)
  evidenceLinks: EvidenceLink[];       // Sources that confirm/refute the claim
}

export type ClaimMediaType =
  | 'article'        // News article
  | 'social_post'    // Social media post (text-based)
  | 'video'          // Video clip (YouTube, TikTok, etc.)
  | 'image'          // Still image (may be doctored)
  | 'broadcast'      // TV/radio broadcast segment
  | 'telegram'       // Encrypted messaging channel post
  | 'official'       // Government/military official statement

export type MisinfoCategory =
  | 'fabrication'            // Entirely invented
  | 'manipulation'           // Real content altered
  | 'misleading_framing'     // True facts, false impression
  | 'missing_context'        // Omits critical info
  | 'impersonation'          // Mimics trusted source
  | 'outdated'               // No longer accurate
  | 'satire_misread'         // Humor taken as real
  | 'coordinated_amplification' // Artificially boosted
  | 'cherry_picked'          // Selective data presentation
  | 'appeal_to_authority'    // False expert claims
  | 'emotional_manipulation' // Designed to trigger outrage/fear

export type SeverityTier =
  | 'critical'    // Could cause physical harm, mass panic, or policy damage
  | 'high'        // Significantly distorts understanding of events
  | 'moderate'    // Misleading but limited real-world impact
  | 'low'         // Minor inaccuracy or exaggeration
  | 'benign'      // Accurate or harmless content

export type VerificationStatus =
  | 'unverified'    // No one has checked this yet
  | 'disputed'      // Conflicting assessments
  | 'debunked'      // Proven false
  | 'confirmed'     // Verified accurate
  | 'partly_true'   // Contains truth but is misleading
  | 'satire'        // Confirmed satirical intent

// ============================================================
// SOURCE & AMPLIFICATION
// ============================================================

export interface ClaimSource {
  name: string;                    // Display name: 'IRNA', '@warmonitor_ua', 'CNN', etc.
  type: SourceType;
  country: string;                 // ISO 3166-1 alpha-2 country code
  credibilityRating: number;       // 0–100 from MBFC / Science Feedback style rating
  isStateAffiliated: boolean;
  platform: string;                // 'twitter', 'telegram', 'youtube', 'tv', 'website', etc.
  followerCount?: number;
  knownFor?: string;               // Brief descriptor: 'Iranian state news agency'
}

export type SourceType =
  | 'state_media'
  | 'state_official'
  | 'wire_service'
  | 'legacy_media'
  | 'digital_native'
  | 'influencer'
  | 'anonymous_account'
  | 'bot_network'
  | 'academic'
  | 'ngo'
  | 'eyewitness'

export interface ClaimAmplifier {
  name: string;
  type: SourceType;
  platform: string;
  followerCount?: number;
  amplifiedAt: string;             // ISO 8601 timestamp
  location?: GeoCoord;             // Where the amplifier is geolocated
  isBotSuspected: boolean;
  amplificationMethod: 'repost' | 'quote' | 'reply_thread' | 'hashtag' | 'cross_platform';
}

// ============================================================
// PROPAGATION & REACH
// ============================================================

export interface PropagationProfile {
  speed: PropagationSpeed;
  pattern: PropagationPattern;
  peakVelocity: number;           // Shares per hour at peak
  halfLife: number;                // Hours until claim reaches 50% of peak virality
  crossPlatformHops: number;      // How many platforms the claim jumped to
}

export type PropagationSpeed = 'explosive' | 'fast' | 'steady' | 'slow' | 'contained';

export type PropagationPattern =
  | 'organic_viral'       // Genuine grassroots spread
  | 'seeded_amplified'    // Started by a few, boosted by networks
  | 'state_broadcast'     // Top-down from state media
  | 'bot_swarm'           // Rapid coordinated inauthentic spread
  | 'influencer_cascade'  // Single influencer → mass audience → reshare cascade
  | 'cross_platform_hop'  // Telegram → Twitter → YouTube → TV pipeline

export interface ReachMetrics {
  estimatedImpressions: number;    // Total eyeballs
  shares: number;
  engagementRate: number;          // 0.0–1.0
  countriesReached: string[];      // ISO codes
  languagesSpread: string[];       // ISO 639-1 codes
}

// ============================================================
// EVIDENCE & GROUND TRUTH
// ============================================================

export interface EvidenceLink {
  url: string;                     // Display URL (not clickable in-game — rendered as text)
  title: string;
  sourceReliability: number;       // 0–100
  verdict: 'supports' | 'refutes' | 'inconclusive';
  snippet: string;                 // Brief excerpt explaining relevance
}

// ============================================================
// NARRATIVE — Competing interpretations of the same event
// ============================================================

export interface Narrative {
  id: string;                      // 'NAR-001', 'NAR-002', etc.
  scenarioId: string;
  title: string;                   // 'Iran claims chemical plant, not nuclear facility'
  summary: string;
  linkedEventIds: string[];        // WorldView kinetic/cyber event IDs this relates to
  linkedClaimIds: string[];        // Feed claim IDs supporting this narrative
  origin: NarrativeOrigin;
  firstSeen: string;               // ISO 8601
  dominancePeriod?: {              // Window when this was the dominant narrative
    start: string;
    end: string;
  };
  competingNarrativeIds: string[]; // Other narratives about the same event
  truthAlignment: number;          // 0–100 how close this narrative is to ground truth
}

export type NarrativeOrigin =
  | 'state_manufactured'   // Deliberately created by a state actor
  | 'media_consensus'      // Emerged from mainstream reporting
  | 'grassroots'           // Organic public interpretation
  | 'expert_analysis'      // Emerged from analyst/academic community
  | 'fog_of_war'           // Genuine confusion during fast-moving events

// ============================================================
// BOT NETWORK — Coordinated inauthentic behavior
// ============================================================

export interface BotNetwork {
  id: string;                      // 'BOT-001', etc.
  scenarioId: string;
  name: string;                    // Analyst-assigned name: 'Tehran Amplification Cluster'
  attributedTo?: string;           // Country or org if attribution is assessed
  nodeCount: number;               // Estimated number of accounts
  platforms: string[];
  primaryLocation: GeoCoord;       // Assessed geographic center of operations
  nodes: BotNode[];                // Individual bot accounts (for network graph)
  activePeriod: {
    start: string;
    end: string;
  };
  targetClaimIds: string[];        // Claims this network amplified
  detectionConfidence: number;     // 0–100
}

export interface BotNode {
  id: string;
  location: GeoCoord;
  platform: string;
  accountAge: number;              // Days since account creation
  postFrequency: number;           // Posts per hour during active period
  connectedNodeIds: string[];      // Other nodes this one interacts with
}

// ============================================================
// INFORMATION FOG — Regional information environment quality
// ============================================================

export interface InfoFogZone {
  id: string;
  scenarioId: string;
  name: string;                    // 'Tehran Information Blackout'
  center: GeoCoord;
  radiusKm: number;
  fogLevel: FogLevel;
  cause: FogCause;
  activePeriod: {
    start: string;
    end: string;
  };
  description: string;
}

export type FogLevel = 'total' | 'severe' | 'moderate' | 'light';

export type FogCause =
  | 'internet_shutdown'    // State-imposed internet blackout
  | 'media_suppression'    // Journalists expelled/arrested
  | 'active_jamming'       // Communications jamming
  | 'disinfo_saturation'   // So much disinfo that signal is lost
  | 'access_denied'        // Physical access denied to area
  | 'fog_of_war'           // Genuine confusion in active conflict

// ============================================================
// SHARED PRIMITIVES
// ============================================================

export interface GeoCoord {
  lat: number;
  lon: number;
  alt?: number;                    // Meters — optional
}
```

### 2.2 Configuration — `src/feed/config.ts`

```typescript
/**
 * Feed layer configuration constants.
 * Follows the pattern established in src/config.ts
 */

export const FEED_CONFIG = {
  // --- Rendering ---
  PROPAGATION_RING_OPACITY: 0.25,
  PROPAGATION_RING_MAX_RADIUS_KM: 2000,
  PROPAGATION_ANIMATION_DURATION_MS: 3000,
  CLAIM_MARKER_SIZE_PX: 24,
  CLAIM_CARD_MAX_WIDTH_PX: 320,
  BOT_NETWORK_EDGE_OPACITY: 0.4,
  BOT_NETWORK_NODE_SIZE_PX: 6,
  FOG_OVERLAY_MAX_OPACITY: 0.6,

  // --- Colors (supplement INFO_EVENT_COLORS) ---
  PROPAGATION_RING_COLOR: 'rgba(233, 30, 99, 0.3)',     // Pink ripple
  PROPAGATION_RING_ORGANIC: 'rgba(255, 193, 7, 0.3)',   // Yellow ripple
  BOT_EDGE_COLOR: 'rgba(255, 111, 0, 0.5)',             // Amber edges
  FOG_COLOR: 'rgba(55, 71, 79, 0.5)',                   // Dark gray fog

  // --- Timing ---
  CLAIM_POLL_INTERVAL_MS: 5000,    // How often to check for new claims in replay
  PROPAGATION_UPDATE_INTERVAL_MS: 1000,
  NARRATIVE_CHECK_INTERVAL_MS: 10000,

  // --- Scoring (game mode) ---
  CREDIBILITY_START: 50,
  CREDIBILITY_MAX: 100,
  CREDIBILITY_CORRECT_FLAG: 8,
  CREDIBILITY_INCORRECT_FLAG: -12,   // Asymmetric — easy to lose, hard to gain
  CREDIBILITY_CORRECT_BOOST: 10,
  CREDIBILITY_INCORRECT_BOOST: -20,  // Boosting misinfo is very costly
  CREDIBILITY_CORRECT_CONTEXT: 15,   // Highest reward for nuanced action
  CREDIBILITY_INVESTIGATION_BONUS: 3, // Bonus just for investigating (rewarding process)

  // --- Feed Panel ---
  FEED_PANEL_MAX_ITEMS: 50,
  FEED_PANEL_AUTO_SCROLL: true,

  // --- Keyboard ---
  KEY_TOGGLE_FEED: 'N',             // Toggle Feed layer visibility
  KEY_TOGGLE_FOG: 'J',              // Toggle Information Fog overlay
  KEY_TOGGLE_NETWORKS: 'K',         // Toggle Bot Network graph
  KEY_OPEN_WORKBENCH: 'V',          // Open Verification Workbench for selected claim
} as const;
```

---

## 3. New Source Files

### 3.1 Source Tree Addition

```
src/
├── feed/                          # The Feed — information environment layer
│   ├── types.ts                   # All types from Section 2.1 above
│   ├── config.ts                  # Configuration from Section 2.2 above
│   ├── manager.ts                 # Feed layer lifecycle: init, update, destroy
│   ├── claims.ts                  # Claim entity management (create, update, remove Cesium entities)
│   ├── propagation.ts             # Animated propagation ring renderer
│   ├── narratives.ts              # Narrative thread tracking + competing narrative UI
│   ├── network.ts                 # Bot network graph renderer (nodes + edges on globe)
│   ├── fog.ts                     # Information fog zone overlay renderer
│   ├── workbench.ts               # Verification workbench UI (HTML overlay)
│   ├── scoring.ts                 # Credibility score tracking + HUD element
│   └── scenario-epic-fury.ts      # Epic Fury info-domain scenario data
│
├── data/
│   └── events-info.ts             # Information events for timeline (extends existing events.ts pattern)
│
├── ui/
│   └── feed-panel.ts              # Right-side scrolling feed panel
```

### 3.2 Module Responsibilities

#### `src/feed/manager.ts` — Layer Lifecycle

```typescript
/**
 * FeedManager — orchestrates the entire Feed layer.
 *
 * Hooks into:
 *   - TimeController (src/time/controller.ts) for LIVE/REPLAY time state
 *   - Overlay config (src/overlay-config.ts) for layer toggle registration
 *   - Main init (src/main.ts) for keyboard bindings
 *
 * Lifecycle:
 *   1. init(viewer, timeController) — register layers, load scenario
 *   2. update(currentTime) — called on each timeline tick
 *   3. destroy() — clean up all Cesium entities and DOM elements
 */

export class FeedManager {
  private viewer: Cesium.Viewer;
  private timeController: TimeController;
  private claimRenderer: ClaimRenderer;
  private propagationRenderer: PropagationRenderer;
  private narrativeTracker: NarrativeTracker;
  private networkRenderer: NetworkRenderer;
  private fogRenderer: FogRenderer;
  private workbench: VerificationWorkbench;
  private scoring: ScoringEngine;
  private feedPanel: FeedPanel;

  private claims: Map<string, Claim>;
  private narratives: Map<string, Narrative>;
  private botNetworks: Map<string, BotNetwork>;
  private fogZones: Map<string, InfoFogZone>;

  private gameModeEnabled: boolean;
  private layerVisible: boolean;

  init(viewer: Cesium.Viewer, timeController: TimeController): void;
  loadScenario(scenarioId: string): void;
  update(currentTime: Cesium.JulianDate): void;
  destroy(): void;

  // --- Layer toggles ---
  toggleFeedLayer(): void;
  toggleFogOverlay(): void;
  toggleNetworkGraph(): void;
  toggleGameMode(): void;

  // --- Claim interaction ---
  selectClaim(claimId: string): void;
  openWorkbench(claimId: string): void;

  // --- Game mode actions ---
  flagClaim(claimId: string): void;
  boostClaim(claimId: string): void;
  addContext(claimId: string, context: string): void;
}
```

#### `src/feed/claims.ts` — Claim Entity Renderer

```typescript
/**
 * Renders claims as Cesium entities on the globe.
 *
 * Each claim gets:
 *   - A billboard marker at its origin coordinates
 *   - Color-coded by InfoEventType (using INFO_EVENT_COLORS)
 *   - Size scaled by severity tier
 *   - An HTML overlay card on hover (follows existing event-cards.ts pattern)
 *   - A pulsing animation for unverified critical claims
 *
 * Time-aware: only shows claims whose timestamp <= current timeline time.
 */

export class ClaimRenderer {
  constructor(viewer: Cesium.Viewer);

  addClaim(claim: Claim): Cesium.Entity;
  removeClaim(claimId: string): void;
  updateVisibility(currentTime: Cesium.JulianDate): void;
  highlightClaim(claimId: string): void;
  clearHighlight(): void;

  // Returns HTML for the hover card (Panoptix-style overlay)
  private buildClaimCard(claim: Claim): string;
}
```

#### `src/feed/propagation.ts` — Propagation Ring Renderer

```typescript
/**
 * Renders animated concentric rings showing claim spread over time.
 *
 * Visual: translucent colored rings expanding outward from claim origin.
 * Speed/pattern driven by claim's PropagationProfile.
 *
 * Implementation: Cesium EllipseGraphics with animated semiMajorAxis
 * using CallbackProperty tied to timeline clock.
 *
 * Ring color:
 *   - Pink/red for state disinfo
 *   - Amber for bot-amplified
 *   - Yellow for organic misinfo
 *   - Green for corrections/verifications
 */

export class PropagationRenderer {
  constructor(viewer: Cesium.Viewer);

  startPropagation(claim: Claim): void;
  stopPropagation(claimId: string): void;
  updateAll(currentTime: Cesium.JulianDate): void;
  destroy(): void;

  // Calculate current radius based on propagation profile and elapsed time
  private calculateRadius(claim: Claim, currentTime: Cesium.JulianDate): number;
}
```

#### `src/feed/network.ts` — Bot Network Graph Renderer

```typescript
/**
 * Renders bot network topology on the globe.
 *
 * Nodes: small colored dots at each bot account's geolocated position.
 * Edges: polyline arcs connecting nodes that interact.
 * Animation: edges pulse when the network is actively amplifying.
 *
 * Implementation: Cesium PointPrimitiveCollection for nodes,
 * PolylineCollection for edges. Similar pattern to traffic particles
 * but with network topology instead of road networks.
 */

export class NetworkRenderer {
  constructor(viewer: Cesium.Viewer);

  renderNetwork(network: BotNetwork): void;
  removeNetwork(networkId: string): void;
  setActiveAmplification(networkId: string, active: boolean): void;
  updateVisibility(currentTime: Cesium.JulianDate): void;
  destroy(): void;
}
```

#### `src/feed/fog.ts` — Information Fog Renderer

```typescript
/**
 * Renders information fog zones as semi-transparent overlays.
 *
 * Visual: dark translucent polygons with animated noise/static effect
 * at the zone boundary. Fog level controls opacity:
 *   - total: 0.6 opacity, heavy noise grain
 *   - severe: 0.45, moderate noise
 *   - moderate: 0.3, light noise
 *   - light: 0.15, subtle overlay
 *
 * Implementation: Cesium EllipseGraphics with custom material.
 * Can reuse the noise grain pattern from the CRT/NV shader system
 * (src/filters/shaders.ts) applied as a material rather than
 * post-process — or use a simpler animated alpha mask.
 *
 * Time-aware: zones appear/disappear based on activePeriod.
 */

export class FogRenderer {
  constructor(viewer: Cesium.Viewer);

  addZone(zone: InfoFogZone): void;
  removeZone(zoneId: string): void;
  updateVisibility(currentTime: Cesium.JulianDate): void;
  destroy(): void;
}
```

#### `src/feed/workbench.ts` — Verification Workbench

```typescript
/**
 * HTML overlay panel for investigating a selected claim.
 *
 * Layout: split panel.
 *   Left: the claim as it appears in the feed (headline, source, media).
 *   Right: investigation tools panel with tabs:
 *     - Source Info: source credibility rating, country, history
 *     - Cross-Reference: what other sources say (from evidenceLinks)
 *     - Timeline: when the claim appeared vs. when the event happened
 *     - Ground Truth: revealed after investigation (or in analyst mode)
 *
 * In game mode, players must spend investigation time before
 * ground truth is revealed. In analyst mode, everything is visible.
 *
 * Follows the existing panel patterns in src/ui/panel.ts and
 * src/ui/right-panel.ts.
 */

export class VerificationWorkbench {
  constructor(container: HTMLElement);

  open(claim: Claim, relatedEvent?: WorldViewEvent): void;
  close(): void;
  isOpen(): boolean;

  // Game mode: reveal ground truth after investigation
  revealGroundTruth(claimId: string): void;

  // Callbacks for game mode actions
  onFlag: (claimId: string) => void;
  onBoost: (claimId: string) => void;
  onContext: (claimId: string, text: string) => void;
}
```

#### `src/feed/scoring.ts` — Credibility Scoring Engine

```typescript
/**
 * Tracks player credibility score in game mode.
 *
 * Renders as a HUD element (top-right, near existing HUD stats).
 * Score bar: 0–100, color gradient from red (low) through yellow
 * to green (high). Asymmetric scoring: credibility is hard to build
 * and easy to lose.
 *
 * Also tracks Public Trust meter — aggregate information health
 * of the scenario. Unflagged disinfo degrades public trust.
 *
 * Only active when gameModeEnabled = true.
 */

export class ScoringEngine {
  constructor(container: HTMLElement);

  enable(): void;
  disable(): void;

  // Player actions
  recordFlag(claimId: string, claim: Claim): ScoreResult;
  recordBoost(claimId: string, claim: Claim): ScoreResult;
  recordContext(claimId: string, claim: Claim): ScoreResult;
  recordInvestigation(claimId: string): void;

  // Passive tracking
  recordUnflaggedViral(claim: Claim): void;  // Misinfo went viral unchecked

  getCredibility(): number;
  getPublicTrust(): number;
  getRank(): AnalystRank;

  private updateHUD(): void;
}

export interface ScoreResult {
  delta: number;
  newScore: number;
  correct: boolean;
  feedback: string;   // Brief explanation shown to player
}

export type AnalystRank =
  | 'Intern'
  | 'Junior Analyst'
  | 'Senior Analyst'
  | 'Lead Investigator'
  | 'Bureau Chief';
```

---

## 4. Scenario Data — Operation Epic Fury Information Domain

### 4.1 `src/feed/scenario-epic-fury.ts`

This file contains all claims, narratives, bot networks, and fog zones for the Epic Fury scenario. Below is the data structure and representative entries. The full scenario should contain **40–60 claims**, **8–12 narratives**, **3–5 bot networks**, and **4–6 fog zones** spanning the 3-day timeline.

```typescript
import { Claim, Narrative, BotNetwork, InfoFogZone } from './types';

// ============================================================
// CLAIMS — 40–60 entries (representative sample below)
// ============================================================

export const EPIC_FURY_CLAIMS: Claim[] = [

  // --- H-Hour: First claims emerge ---
  {
    id: 'CLM-001',
    scenarioId: 'epic-fury',
    headline: 'IRNA: Explosion at Isfahan chemical plant — no nuclear connection',
    body: 'Iranian state news agency IRNA reports explosions at what it describes as a petrochemical storage facility near Isfahan. The report explicitly denies any connection to nuclear facilities and attributes the explosion to an industrial accident. No mention of military activity.',
    mediaType: 'article',
    infoEventType: 'disinfo_state',
    misinfoTaxonomy: ['fabrication', 'misleading_framing'],
    truthScore: 8,
    severityTier: 'critical',
    origin: { lat: 35.6892, lon: 51.3890 },         // Tehran (IRNA HQ)
    targetLocation: { lat: 32.6546, lon: 51.6680 },  // Isfahan
    propagationRadius: 500,
    timestamp: '2026-02-28T02:20:00Z',                // H+6min
    peakTimestamp: '2026-02-28T04:00:00Z',
    source: {
      name: 'IRNA',
      type: 'state_media',
      country: 'IR',
      credibilityRating: 15,
      isStateAffiliated: true,
      platform: 'website',
      knownFor: 'Islamic Republic News Agency — official Iranian state news',
    },
    amplifiers: [
      {
        name: 'PressTV',
        type: 'state_media',
        platform: 'twitter',
        followerCount: 850000,
        amplifiedAt: '2026-02-28T02:25:00Z',
        isBotSuspected: false,
        amplificationMethod: 'repost',
      },
      {
        name: '@truth_seeker_2024',
        type: 'anonymous_account',
        platform: 'twitter',
        followerCount: 45000,
        amplifiedAt: '2026-02-28T02:32:00Z',
        location: { lat: 55.7558, lon: 37.6173 },   // Moscow
        isBotSuspected: true,
        amplificationMethod: 'quote',
      },
    ],
    linkedGroundTruthEventId: 'EF-NATANZ-STRIKE',
    propagation: {
      speed: 'explosive',
      pattern: 'state_broadcast',
      peakVelocity: 12000,
      halfLife: 8,
      crossPlatformHops: 4,
    },
    reach: {
      estimatedImpressions: 45000000,
      shares: 180000,
      engagementRate: 0.04,
      countriesReached: ['IR', 'IQ', 'SY', 'LB', 'RU', 'CN', 'PK'],
      languagesSpread: ['fa', 'ar', 'ru', 'en'],
    },
    verificationStatus: 'debunked',
    groundTruthSummary: 'The explosion was a precision-guided munition strike on the Natanz uranium enrichment facility, confirmed by satellite imagery and US DoD statement. No chemical plant exists at the target coordinates.',
    evidenceLinks: [
      {
        url: 'pentagon.mil/press-release-028',
        title: 'DoD confirms strikes on Iranian nuclear facilities',
        sourceReliability: 85,
        verdict: 'refutes',
        snippet: 'US Central Command confirmed precision strikes against four Iranian nuclear facilities including Natanz.',
      },
      {
        url: 'planet.com/imagery/isfahan-028',
        title: 'Satellite imagery — Isfahan/Natanz 28 Feb 2026',
        sourceReliability: 95,
        verdict: 'refutes',
        snippet: 'Before/after imagery shows destruction consistent with military strike at known Natanz enrichment facility coordinates.',
      },
      {
        url: 'iaea.org/iran-facilities',
        title: 'IAEA — Known Iranian Nuclear Facilities',
        sourceReliability: 98,
        verdict: 'refutes',
        snippet: 'Natanz is a declared uranium enrichment facility. No petrochemical facilities are located at these coordinates.',
      },
    ],
  },

  // --- Deepfake: Fabricated surrender video ---
  {
    id: 'CLM-007',
    scenarioId: 'epic-fury',
    headline: 'Video circulating: Iranian military commander announces ceasefire',
    body: 'A video purporting to show IRGC General Hossein Salami announcing an immediate ceasefire and surrender of nuclear materials is circulating on Telegram and Twitter. The video shows signs of AI generation including inconsistent lip sync and audio artifacts.',
    mediaType: 'video',
    infoEventType: 'deepfake',
    misinfoTaxonomy: ['fabrication', 'impersonation'],
    truthScore: 0,
    severityTier: 'critical',
    origin: { lat: 32.0853, lon: 34.7818 },          // Tel Aviv (assessed origin)
    targetLocation: { lat: 35.6892, lon: 51.3890 },
    propagationRadius: 1200,
    timestamp: '2026-02-28T06:15:00Z',
    peakTimestamp: '2026-02-28T09:00:00Z',
    decayTimestamp: '2026-02-28T14:00:00Z',
    source: {
      name: '@mideast_breaking',
      type: 'anonymous_account',
      country: 'unknown',
      credibilityRating: 5,
      isStateAffiliated: false,
      platform: 'telegram',
      knownFor: 'Anonymous account, created 72 hours before conflict',
    },
    amplifiers: [],
    propagation: {
      speed: 'explosive',
      pattern: 'seeded_amplified',
      peakVelocity: 25000,
      halfLife: 4,
      crossPlatformHops: 5,
    },
    reach: {
      estimatedImpressions: 80000000,
      shares: 320000,
      engagementRate: 0.08,
      countriesReached: ['IR', 'US', 'IL', 'GB', 'DE', 'FR', 'SA', 'AE'],
      languagesSpread: ['en', 'fa', 'ar', 'he'],
    },
    verificationStatus: 'debunked',
    groundTruthSummary: 'AI-generated deepfake. IRGC issued denial via official channels. Video analysis by multiple forensic labs confirmed synthetic generation artifacts. Gen. Salami appeared on IRIB live broadcast 3 hours after video surfaced.',
    evidenceLinks: [
      {
        url: 'reuters.com/factcheck/iran-ceasefire-video',
        title: 'Fact check: Purported Iranian ceasefire video is AI-generated',
        sourceReliability: 92,
        verdict: 'refutes',
        snippet: 'Digital forensics analysis reveals inconsistent facial rendering, audio desync, and metadata indicating AI generation tools.',
      },
    ],
  },

  // --- Organic misinfo: real footage, wrong context ---
  {
    id: 'CLM-012',
    scenarioId: 'epic-fury',
    headline: 'Shocking: entire Tehran neighborhood destroyed — hundreds feared dead',
    body: 'Viral video showing massive building collapse and fires with caption claiming US strikes leveled a residential neighborhood in south Tehran. The video is real but is actually footage from the 2020 Beirut port explosion, not Tehran.',
    mediaType: 'video',
    infoEventType: 'misinfo_outdated',
    misinfoTaxonomy: ['manipulation', 'outdated', 'emotional_manipulation'],
    truthScore: 5,
    severityTier: 'high',
    origin: { lat: 34.0522, lon: -118.2437 },        // Los Angeles (original poster)
    targetLocation: { lat: 35.6892, lon: 51.3890 },
    propagationRadius: 800,
    timestamp: '2026-02-28T08:42:00Z',
    source: {
      name: '@concerned_citizen_la',
      type: 'anonymous_account',
      country: 'US',
      credibilityRating: 10,
      isStateAffiliated: false,
      platform: 'twitter',
      followerCount: 2300,
    },
    amplifiers: [],
    propagation: {
      speed: 'fast',
      pattern: 'organic_viral',
      peakVelocity: 8000,
      halfLife: 6,
      crossPlatformHops: 3,
    },
    reach: {
      estimatedImpressions: 22000000,
      shares: 95000,
      engagementRate: 0.06,
      countriesReached: ['US', 'GB', 'CA', 'AU'],
      languagesSpread: ['en'],
    },
    verificationStatus: 'debunked',
    groundTruthSummary: 'Reverse image search confirms this is footage from the August 4, 2020 Beirut port explosion. No residential neighborhoods in Tehran were targeted in Operation Epic Fury strikes.',
    evidenceLinks: [
      {
        url: 'bellingcat.com/beirut-footage-misattributed',
        title: 'Old Beirut explosion footage circulating as Tehran strike',
        sourceReliability: 90,
        verdict: 'refutes',
        snippet: 'Frame-by-frame comparison with archived Beirut footage confirms identical source video. Geolocation of visible landmarks matches Beirut port, not Tehran.',
      },
    ],
  },
];

// ============================================================
// NARRATIVES
// ============================================================

export const EPIC_FURY_NARRATIVES: Narrative[] = [
  {
    id: 'NAR-001',
    scenarioId: 'epic-fury',
    title: 'Industrial accident, not military strike',
    summary: 'Iranian state media narrative claiming all explosions are industrial accidents at chemical/petrochemical plants with no nuclear or military connection.',
    linkedEventIds: ['EF-NATANZ-STRIKE', 'EF-ISFAHAN-STRIKE', 'EF-FORDOW-STRIKE'],
    linkedClaimIds: ['CLM-001', 'CLM-003', 'CLM-005'],
    origin: 'state_manufactured',
    firstSeen: '2026-02-28T02:20:00Z',
    dominancePeriod: {
      start: '2026-02-28T02:20:00Z',
      end: '2026-02-28T06:00:00Z',
    },
    competingNarrativeIds: ['NAR-002', 'NAR-003'],
    truthAlignment: 5,
  },
  {
    id: 'NAR-002',
    scenarioId: 'epic-fury',
    title: 'Precision strikes on nuclear facilities — limited military operation',
    summary: 'US/coalition narrative of targeted strikes against Iranian nuclear weapons program infrastructure only, with no intent to strike civilian targets or pursue regime change.',
    linkedEventIds: ['EF-NATANZ-STRIKE', 'EF-ISFAHAN-STRIKE', 'EF-FORDOW-STRIKE', 'EF-PARCHIN-STRIKE'],
    linkedClaimIds: ['CLM-002', 'CLM-004'],
    origin: 'media_consensus',
    firstSeen: '2026-02-28T03:00:00Z',
    dominancePeriod: {
      start: '2026-02-28T06:00:00Z',
      end: '2026-03-02T00:00:00Z',
    },
    competingNarrativeIds: ['NAR-001', 'NAR-003'],
    truthAlignment: 75,
  },
  {
    id: 'NAR-003',
    scenarioId: 'epic-fury',
    title: 'Unprovoked aggression — genocide against Iranian people',
    summary: 'Narrative framing the strikes as unprovoked Western aggression targeting civilians, amplified by bot networks and state-aligned influencers. Uses recycled footage from other conflicts as evidence of civilian casualties.',
    linkedEventIds: ['EF-NATANZ-STRIKE'],
    linkedClaimIds: ['CLM-012', 'CLM-015', 'CLM-018'],
    origin: 'state_manufactured',
    firstSeen: '2026-02-28T04:30:00Z',
    competingNarrativeIds: ['NAR-001', 'NAR-002'],
    truthAlignment: 10,
  },
];

// ============================================================
// BOT NETWORKS
// ============================================================

export const EPIC_FURY_BOT_NETWORKS: BotNetwork[] = [
  {
    id: 'BOT-001',
    scenarioId: 'epic-fury',
    name: 'Tehran Echo Chamber',
    attributedTo: 'Iran — IRGC Cyber Command (assessed)',
    nodeCount: 1200,
    platforms: ['twitter', 'telegram', 'facebook'],
    primaryLocation: { lat: 35.6892, lon: 51.3890 },
    nodes: [
      // Representative sample — full data would include 20–50 visible nodes
      { id: 'BN1-001', location: { lat: 35.70, lon: 51.42 }, platform: 'twitter', accountAge: 45, postFrequency: 12, connectedNodeIds: ['BN1-002', 'BN1-003'] },
      { id: 'BN1-002', location: { lat: 35.68, lon: 51.35 }, platform: 'twitter', accountAge: 30, postFrequency: 18, connectedNodeIds: ['BN1-001', 'BN1-004'] },
      { id: 'BN1-003', location: { lat: 35.72, lon: 51.40 }, platform: 'telegram', accountAge: 60, postFrequency: 8, connectedNodeIds: ['BN1-001'] },
      { id: 'BN1-004', location: { lat: 35.65, lon: 51.38 }, platform: 'facebook', accountAge: 22, postFrequency: 25, connectedNodeIds: ['BN1-002'] },
    ],
    activePeriod: {
      start: '2026-02-28T02:15:00Z',
      end: '2026-03-02T12:00:00Z',
    },
    targetClaimIds: ['CLM-001', 'CLM-003', 'CLM-015'],
    detectionConfidence: 78,
  },
  {
    id: 'BOT-002',
    scenarioId: 'epic-fury',
    name: 'St. Petersburg Troll Factory — Iran Support Cluster',
    attributedTo: 'Russia — IRA successor org (assessed)',
    nodeCount: 800,
    platforms: ['twitter', 'reddit', 'youtube'],
    primaryLocation: { lat: 59.9343, lon: 30.3351 },
    nodes: [
      { id: 'BN2-001', location: { lat: 59.94, lon: 30.32 }, platform: 'twitter', accountAge: 180, postFrequency: 6, connectedNodeIds: ['BN2-002'] },
      { id: 'BN2-002', location: { lat: 59.93, lon: 30.35 }, platform: 'reddit', accountAge: 90, postFrequency: 10, connectedNodeIds: ['BN2-001', 'BN2-003'] },
      { id: 'BN2-003', location: { lat: 59.95, lon: 30.30 }, platform: 'youtube', accountAge: 365, postFrequency: 3, connectedNodeIds: ['BN2-002'] },
    ],
    activePeriod: {
      start: '2026-02-28T03:00:00Z',
      end: '2026-03-02T18:00:00Z',
    },
    targetClaimIds: ['CLM-012', 'CLM-018', 'CLM-022'],
    detectionConfidence: 65,
  },
];

// ============================================================
// INFORMATION FOG ZONES
// ============================================================

export const EPIC_FURY_FOG_ZONES: InfoFogZone[] = [
  {
    id: 'FOG-001',
    scenarioId: 'epic-fury',
    name: 'Tehran Total Blackout',
    center: { lat: 35.6892, lon: 51.3890 },
    radiusKm: 80,
    fogLevel: 'total',
    cause: 'internet_shutdown',
    activePeriod: {
      start: '2026-02-28T02:30:00Z',
      end: '2026-03-01T14:00:00Z',
    },
    description: 'Complete internet and mobile communications shutdown across greater Tehran following initial strikes. No independent reporting possible. All information from inside the zone originates from state media or satellite phones.',
  },
  {
    id: 'FOG-002',
    scenarioId: 'epic-fury',
    name: 'Isfahan Information Void',
    center: { lat: 32.6546, lon: 51.6680 },
    radiusKm: 50,
    fogLevel: 'severe',
    cause: 'access_denied',
    activePeriod: {
      start: '2026-02-28T02:14:00Z',
      end: '2026-03-02T00:00:00Z',
    },
    description: 'IRGC security cordon established around Isfahan/Natanz strike zone. All journalists and civilians evacuated. No independent access. Information limited to satellite imagery and state-controlled releases.',
  },
  {
    id: 'FOG-003',
    scenarioId: 'epic-fury',
    name: 'Strait of Hormuz — Disinfo Saturation',
    center: { lat: 26.5667, lon: 56.2500 },
    radiusKm: 150,
    fogLevel: 'moderate',
    cause: 'disinfo_saturation',
    activePeriod: {
      start: '2026-03-01T06:00:00Z',
      end: '2026-03-02T18:00:00Z',
    },
    description: 'Conflicting claims about Strait of Hormuz status from Iranian, US, and Gulf state sources. Reports of mine deployment contradict shipping company AIS data. Multiple false tanker-attack claims making ground truth difficult to establish.',
  },
];
```

---

## 5. Integration Points with Existing WorldView Code

### 5.1 Timeline Integration — `src/time/data-adapter.ts`

Add info events to the existing timeline adapter. The adapter already converts events to timeline markers. Extend it to handle InfoEventType:

```typescript
// Add to existing EventType union in src/data/events.ts:
export type EventType =
  | 'kinetic' | 'retaliation' | 'civilian_impact' | 'infrastructure'
  | 'escalation' | 'maritime' | 'intelligence' | 'cyber'
  // NEW — The Feed info-domain events:
  | InfoEventType;

// Add to existing EVENT_COLORS in src/data/events.ts:
// Spread in INFO_EVENT_COLORS from src/feed/types.ts
```

### 5.2 Overlay Config — `src/overlay-config.ts`

Register three new toggle layers:

```typescript
// Add to overlay configuration:
{
  id: 'feed',
  label: 'Information Feed',
  icon: '📰',
  key: 'N',
  defaultVisible: false,
  group: 'intelligence',
},
{
  id: 'info-fog',
  label: 'Information Fog',
  icon: '🌫️',
  key: 'J',
  defaultVisible: false,
  group: 'intelligence',
},
{
  id: 'bot-networks',
  label: 'Bot Networks',
  icon: '🕸️',
  key: 'K',
  defaultVisible: false,
  group: 'intelligence',
},
```

### 5.3 Main Init — `src/main.ts`

Add to keyboard bindings and system initialization:

```typescript
// In init():
const feedManager = new FeedManager();
feedManager.init(viewer, timeController);
feedManager.loadScenario('epic-fury');

// In keyboard handler:
case 'n': feedManager.toggleFeedLayer(); break;
case 'j': feedManager.toggleFogOverlay(); break;
case 'k': feedManager.toggleNetworkGraph(); break;
case 'v': feedManager.openWorkbench(selectedClaimId); break;
```

### 5.4 HUD — `src/ui/hud.ts`

Add Feed stats to the existing HUD:

```typescript
// New HUD line items when Feed layer is active:
// CLAIMS: 12/47 visible | NARRATIVES: 3 active | FOG ZONES: 2 | PUBLIC TRUST: 72%
```

### 5.5 Event Cards — `src/layers/event-cards.ts`

The existing Panoptix-style event card system renders HTML overlays above map positions. Claim cards follow the same pattern but with distinct styling:

```
┌─────────────────────────────────┐
│ 📰 CLAIM — CLM-001             │  ← InfoEventType color bar
│ ─────────────────────────────── │
│ IRNA: Explosion at Isfahan      │  ← Headline (truncated)
│ chemical plant — no nuclear...  │
│                                 │
│ Source: IRNA (IR) ★ 15/100      │  ← Source + credibility
│ Reach: 45M impressions          │  ← Reach metrics
│ Truth: ██░░░░░░░░ 8/100         │  ← Truth score bar (hidden in game mode)
│                                 │
│ [Investigate]  [Flag]  [Boost]  │  ← Game mode action buttons
└─────────────────────────────────┘
```

---

## 6. UI Specifications

### 6.1 Feed Panel — `src/ui/feed-panel.ts`

A scrollable panel on the right side (below or tabbed with the existing right panel) showing a chronological feed of claims:

```
┌─ THE FEED ────────────────────── Filter: [All ▾] ─┐
│                                                     │
│  02:20 UTC │ 📰 IRNA: Explosion at Isfahan...      │
│            │ Source: IRNA (IR) ★ 15                 │
│            │ ████████░░ 45M reach                   │
│            │ ● CRITICAL  ● STATE DISINFO            │
│  ──────────┼────────────────────────────────────── │
│  06:15 UTC │ 🎭 Video: Iranian commander...         │
│            │ Source: @mideast_breaking ★ 5           │
│            │ ██████████ 80M reach                   │
│            │ ● CRITICAL  ● DEEPFAKE                 │
│  ──────────┼────────────────────────────────────── │
│  08:42 UTC │ 🔄 Shocking: entire Tehran...          │
│            │ Source: @concerned_citizen_la ★ 10      │
│            │ ██████░░░░ 22M reach                   │
│            │ ● HIGH  ● OUTDATED FOOTAGE             │
│                                                     │
│  ─── Earlier ───────────────────────────────────── │
└─────────────────────────────────────────────────────┘
```

**Filters:** All, State Disinfo, Deepfake, Organic Misinfo, Corrections, By Severity, By Narrative

**Interactions:** Click a claim → camera flies to origin + highlights on globe. Double-click → opens Verification Workbench.

### 6.2 Verification Workbench Layout

Full-width overlay panel (similar to the left detail panel but wider):

```
┌─ VERIFICATION WORKBENCH ──────────────────────────────────────── [×] ─┐
│                                                                        │
│  ┌─ CLAIM ──────────────────────┐  ┌─ INVESTIGATION ───────────────┐  │
│  │                              │  │                               │  │
│  │  IRNA: Explosion at Isfahan  │  │  [Source] [Cross-Ref] [Time]  │  │
│  │  chemical plant — no nuclear │  │                               │  │
│  │  connection                  │  │  SOURCE ANALYSIS               │  │
│  │                              │  │  ─────────────────            │  │
│  │  Source: IRNA                │  │  Name: IRNA                   │  │
│  │  Platform: Website           │  │  Type: State Media            │  │
│  │  Posted: 02:20 UTC           │  │  Country: Iran                │  │
│  │  Reach: 45M                  │  │  Credibility: ██░░░ 15/100    │  │
│  │                              │  │  State Affiliated: YES        │  │
│  │  ┌─────────────────────┐    │  │                               │  │
│  │  │  [media thumbnail]  │    │  │  CROSS-REFERENCE (3 sources)  │  │
│  │  └─────────────────────┘    │  │  ─────────────────            │  │
│  │                              │  │  ✕ DoD: Confirms nuke strike  │  │
│  │                              │  │  ✕ Planet: Sat imagery refutes│  │
│  │                              │  │  ✕ IAEA: No chem plant here   │  │
│  │                              │  │                               │  │
│  └──────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
│  ┌─ ACTIONS ──────────────────────────────────────────────────────┐   │
│  │  [🚩 Flag as Misinfo]  [📢 Boost as Accurate]  [📝 Add Context] │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Credibility HUD (Game Mode Only)

```
┌─ ANALYST STATUS ────────┐
│  Rank: Senior Analyst    │
│  ████████░░░░ 62/100     │   ← Credibility bar (green/yellow/red gradient)
│  Public Trust: ███████░░ │   ← Public trust meter
│  Claims Processed: 18/47 │
│  Accuracy: 78%           │
└──────────────────────────┘
```

---

## 7. Rendering Specifications

### 7.1 Claim Markers

| Property | Value |
|---|---|
| Type | Cesium.Billboard |
| Icon | SVG circle with InfoEventType icon overlay |
| Size | 20px (low severity) → 32px (critical severity) |
| Color | From `INFO_EVENT_COLORS` map |
| Animation | Pulsing glow for unverified critical claims (CSS keyframe via HTML overlay) |
| Label | Claim ID shown at zoom levels < 500km altitude |
| Click | Opens claim card (HTML overlay) |
| Double-click | Opens Verification Workbench |

### 7.2 Propagation Rings

| Property | Value |
|---|---|
| Type | Cesium.EllipseGraphics |
| Material | Color with alpha 0.15–0.25 (from `INFO_EVENT_COLORS`) |
| Animation | `semiMajorAxis` and `semiMinorAxis` grow via `CallbackProperty` |
| Growth rate | Driven by `PropagationProfile.speed` |
| Max radius | `FEED_CONFIG.PROPAGATION_RING_MAX_RADIUS_KM` (2000km) |
| Layers | 3 concentric rings per claim (inner=dense, outer=faded) |

### 7.3 Bot Network Graphs

| Property | Value |
|---|---|
| Nodes | Cesium.PointPrimitiveCollection, 6px, amber |
| Edges | Cesium.PolylineCollection, 1px, amber with 0.4 alpha |
| Animation | Edges pulse opacity when network is actively amplifying |
| Visibility | Only shown when zoom altitude < 2000km |

### 7.4 Information Fog Zones

| Property | Value |
|---|---|
| Type | Cesium.EllipseGraphics with custom material |
| Color | Dark gray (37474F) with variable alpha by FogLevel |
| Effect | Animated noise grain at zone boundary (optional — can use static alpha if perf constrained) |
| total | 0.6 opacity |
| severe | 0.45 opacity |
| moderate | 0.3 opacity |
| light | 0.15 opacity |

---

## 8. Implementation Order

Build in this order. Each phase is independently deployable.

| Phase | Files | Deliverable | Est. LOC |
|---|---|---|---|
| **1. Types + Config** | `feed/types.ts`, `feed/config.ts` | Type system compiles | ~300 |
| **2. Scenario Data** | `feed/scenario-epic-fury.ts`, `data/events-info.ts` | Static data loadable | ~600 |
| **3. Claim Renderer** | `feed/claims.ts`, `feed/manager.ts` (partial) | Claims visible on globe | ~400 |
| **4. Feed Panel** | `ui/feed-panel.ts` | Scrollable claim feed in right panel | ~300 |
| **5. Timeline Integration** | Update `time/data-adapter.ts`, `data/events.ts` | Info events on timeline | ~100 |
| **6. Propagation Rings** | `feed/propagation.ts` | Animated spread visualization | ~250 |
| **7. Information Fog** | `feed/fog.ts` | Fog zone overlays | ~200 |
| **8. Bot Networks** | `feed/network.ts` | Network graph on globe | ~300 |
| **9. Narratives** | `feed/narratives.ts` | Narrative tracking UI | ~250 |
| **10. Workbench** | `feed/workbench.ts` | Investigation panel | ~400 |
| **11. Scoring** | `feed/scoring.ts` | Game mode + credibility HUD | ~300 |
| **12. Layer Controls** | Update `ui/controls.ts`, `main.ts`, `overlay-config.ts` | Toggle switches + keyboard | ~100 |

**Total estimated:** ~3,500 LOC across 12 new files + 5 existing file modifications.

---

## 9. Keyboard Shortcuts (New)

| Key | Action |
|---|---|
| `N` | Toggle Feed layer (claims + propagation) |
| `J` | Toggle Information Fog overlay |
| `K` | Toggle Bot Network graph |
| `V` | Open Verification Workbench for selected claim |
| `B` | Toggle game mode (scoring enabled/disabled) |

---

## 10. Future Extensions

These are out of scope for the initial build but the data structures above are designed to support them:

- [ ] **Live news feed ingestion** — Auto-geocode breaking news via NLP and plot as claims in real-time (connects to WorldView roadmap item "News feed integration")
- [ ] **AI claim classifier** — LLM-powered classification of incoming claims against the misinformation taxonomy
- [ ] **Collaborative verification** — Multiple analysts working the same feed with shared workbench (connects to WorldView roadmap item "Collaborative mode")
- [ ] **Custom scenario editor** — Author Feed scenarios with a visual editor (connects to WorldView roadmap item "Custom scenario editor")
- [ ] **MIST-8 assessment integration** — Pre/post media literacy testing for educational deployments
- [ ] **Export to report** — Generate PDF intelligence brief from processed claims + narratives
- [ ] **Narrative graph visualization** — Force-directed graph showing how narratives compete and evolve
- [ ] **Cross-scenario templates** — Reusable claim/narrative patterns (pandemic, election, disaster) with swappable geospatial data

---

*Designed for WorldView — built with OpenClaw parallel AI coding agents.*
