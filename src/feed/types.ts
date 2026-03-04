// ============================================================
// The Feed — Information Domain Types
// ============================================================

// ============================================================
// INFORMATION EVENT TYPES
// ============================================================

export type InfoEventType =
  | 'disinfo_state'
  | 'disinfo_proxy'
  | 'disinfo_amplified'
  | 'misinfo_organic'
  | 'misinfo_outdated'
  | 'narrative_shift'
  | 'media_blackout'
  | 'deepfake'
  | 'satire_misread'
  | 'correction'
  | 'verification';

export const INFO_EVENT_COLORS: Record<InfoEventType, string> = {
  disinfo_state:     '#E91E63',
  disinfo_proxy:     '#AD1457',
  disinfo_amplified: '#FF6F00',
  misinfo_organic:   '#FFC107',
  misinfo_outdated:  '#FFD54F',
  narrative_shift:   '#7C4DFF',
  media_blackout:    '#37474F',
  deepfake:          '#D500F9',
  satire_misread:    '#00BCD4',
  correction:        '#4CAF50',
  verification:      '#2E7D32',
};

// ============================================================
// LIVE ARTICLE — Simplified type for real-time news
// ============================================================

export interface LiveArticle {
  id: string;
  headline: string;
  source: string;
  url?: string;
  origin: GeoCoord;
  timestamp: string;
  severity: SeverityTier;
  category: string; // e.g. 'kinetic', 'economic', 'diplomatic', 'news'
  imageUrl?: string;
}

/** Convert a LiveArticle to a full Claim for renderers that expect it. */
export function articleToClaim(a: LiveArticle): Claim {
  const typeMap: Record<string, InfoEventType> = {
    kinetic: 'verification', escalation: 'verification', cyber: 'verification',
    economic: 'verification', diplomatic: 'correction', humanitarian: 'correction',
    news: 'verification',
  };
  return {
    id: a.id,
    scenarioId: 'live',
    headline: a.headline,
    body: a.headline,
    mediaType: 'article',
    mediaUrl: a.imageUrl,
    infoEventType: typeMap[a.category] || 'verification',
    misinfoTaxonomy: [],
    truthScore: 50,
    severityTier: a.severity,
    origin: a.origin,
    propagationRadius: 200,
    timestamp: a.timestamp,
    source: { name: a.source, type: 'digital_native', country: 'US', credibilityRating: 60, isStateAffiliated: false, platform: 'website' },
    amplifiers: [],
    propagation: { speed: 'steady', pattern: 'organic_viral', peakVelocity: 1000, halfLife: 12, crossPlatformHops: 1 },
    reach: { estimatedImpressions: 0, shares: 0, engagementRate: 0, countriesReached: ['US'], languagesSpread: ['en'] },
    verificationStatus: 'unverified',
    groundTruthSummary: '',
    evidenceLinks: [],
  };
}

/** Type guard: is this a LiveArticle or a full Claim? */
export function isLiveArticle(item: LiveArticle | Claim): item is LiveArticle {
  return !('scenarioId' in item);
}

// ============================================================
// CLAIM — Full type for scenario/simulation mode
// ============================================================

export interface Claim {
  id: string;
  scenarioId: string;

  headline: string;
  body: string;
  mediaType: ClaimMediaType;
  mediaUrl?: string;

  infoEventType: InfoEventType;
  misinfoTaxonomy: MisinfoCategory[];
  truthScore: number;
  severityTier: SeverityTier;

  origin: GeoCoord;
  targetLocation?: GeoCoord;
  propagationRadius: number;

  timestamp: string;
  peakTimestamp?: string;
  decayTimestamp?: string;
  correctionTimestamp?: string;

  source: ClaimSource;
  amplifiers: ClaimAmplifier[];
  linkedGroundTruthEventId?: string;

  propagation: PropagationProfile;
  reach: ReachMetrics;

  verificationStatus: VerificationStatus;
  groundTruthSummary: string;
  evidenceLinks: EvidenceLink[];
}

export type ClaimMediaType =
  | 'article'
  | 'social_post'
  | 'video'
  | 'image'
  | 'broadcast'
  | 'telegram'
  | 'official';

export type MisinfoCategory =
  | 'fabrication'
  | 'manipulation'
  | 'misleading_framing'
  | 'missing_context'
  | 'impersonation'
  | 'outdated'
  | 'satire_misread'
  | 'coordinated_amplification'
  | 'cherry_picked'
  | 'appeal_to_authority'
  | 'emotional_manipulation';

export type SeverityTier =
  | 'critical'
  | 'high'
  | 'moderate'
  | 'low'
  | 'benign';

export type VerificationStatus =
  | 'unverified'
  | 'disputed'
  | 'debunked'
  | 'confirmed'
  | 'partly_true'
  | 'satire';

// ============================================================
// SOURCE & AMPLIFICATION
// ============================================================

export interface ClaimSource {
  name: string;
  type: SourceType;
  country: string;
  credibilityRating: number;
  isStateAffiliated: boolean;
  platform: string;
  followerCount?: number;
  knownFor?: string;
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
  | 'eyewitness';

export interface ClaimAmplifier {
  name: string;
  type: SourceType;
  platform: string;
  followerCount?: number;
  amplifiedAt: string;
  location?: GeoCoord;
  isBotSuspected: boolean;
  amplificationMethod: 'repost' | 'quote' | 'reply_thread' | 'hashtag' | 'cross_platform';
}

// ============================================================
// PROPAGATION & REACH
// ============================================================

export interface PropagationProfile {
  speed: PropagationSpeed;
  pattern: PropagationPattern;
  peakVelocity: number;
  halfLife: number;
  crossPlatformHops: number;
}

export type PropagationSpeed = 'explosive' | 'fast' | 'steady' | 'slow' | 'contained';

export type PropagationPattern =
  | 'organic_viral'
  | 'seeded_amplified'
  | 'state_broadcast'
  | 'bot_swarm'
  | 'influencer_cascade'
  | 'cross_platform_hop';

export interface ReachMetrics {
  estimatedImpressions: number;
  shares: number;
  engagementRate: number;
  countriesReached: string[];
  languagesSpread: string[];
}

// ============================================================
// EVIDENCE & GROUND TRUTH
// ============================================================

export interface EvidenceLink {
  url: string;
  title: string;
  sourceReliability: number;
  verdict: 'supports' | 'refutes' | 'inconclusive';
  snippet: string;
}

// ============================================================
// NARRATIVE
// ============================================================

export interface Narrative {
  id: string;
  scenarioId: string;
  title: string;
  summary: string;
  linkedEventIds: string[];
  linkedClaimIds: string[];
  origin: NarrativeOrigin;
  firstSeen: string;
  dominancePeriod?: {
    start: string;
    end: string;
  };
  competingNarrativeIds: string[];
  truthAlignment: number;
}

export type NarrativeOrigin =
  | 'state_manufactured'
  | 'media_consensus'
  | 'grassroots'
  | 'expert_analysis'
  | 'fog_of_war';

// ============================================================
// BOT NETWORK
// ============================================================

export interface BotNetwork {
  id: string;
  scenarioId: string;
  name: string;
  attributedTo?: string;
  nodeCount: number;
  platforms: string[];
  primaryLocation: GeoCoord;
  nodes: BotNode[];
  activePeriod: {
    start: string;
    end: string;
  };
  targetClaimIds: string[];
  detectionConfidence: number;
}

export interface BotNode {
  id: string;
  location: GeoCoord;
  platform: string;
  accountAge: number;
  postFrequency: number;
  connectedNodeIds: string[];
}

// ============================================================
// INFORMATION FOG
// ============================================================

export interface InfoFogZone {
  id: string;
  scenarioId: string;
  name: string;
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
  | 'internet_shutdown'
  | 'media_suppression'
  | 'active_jamming'
  | 'disinfo_saturation'
  | 'access_denied'
  | 'fog_of_war';

// ============================================================
// SHARED PRIMITIVES
// ============================================================

export interface GeoCoord {
  lat: number;
  lon: number;
  alt?: number;
}
