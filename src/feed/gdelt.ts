// ============================================================
// GDELT Live News Feed — Real-time geocoded articles
// ============================================================

import type { Claim, GeoCoord, InfoEventType, SeverityTier } from './types';

// Use proxy path for both dev (vite proxy) and production (Vercel edge function)
const GDELT_API = import.meta.env.DEV
  ? '/gdelt/api/v2/doc/doc'
  : '/api/gdelt/api/v2/doc/doc';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
  lat?: number;
  lon?: number;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

/**
 * Fetch live geocoded news from GDELT.
 * Returns articles from the last N minutes, filtered by query.
 */
export async function fetchLiveNews(
  query: string = 'iran OR missile OR military OR conflict',
  maxRecords: number = 50,
  timespan: string = '60min',
): Promise<Claim[]> {
  const params = new URLSearchParams({
    query: query,
    mode: 'artlist',
    maxrecords: String(maxRecords),
    timespan: timespan,
    format: 'json',
    sort: 'datedesc',
  });

  try {
    const res = await fetch(`${GDELT_API}?${params}`);
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    const data: GdeltResponse = await res.json();
    if (!data.articles?.length) return [];

    return data.articles
      .filter(a => a.title && a.url)
      .map((a, i) => articleToClaim(a, i));
  } catch (err) {
    console.warn('[Feed/GDELT] Fetch failed:', err);
    return [];
  }
}

/**
 * Fetch news specifically about Iran/Middle East conflict
 */
export async function fetchConflictNews(): Promise<Claim[]> {
  const queries = [
    'iran strike OR iran war OR iran military',
    'hormuz OR tehran OR IRGC',
    'middle east conflict OR israel iran',
  ];

  const results: Claim[] = [];
  for (const q of queries) {
    const claims = await fetchLiveNews(q, 20, '120min');
    results.push(...claims);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter(c => {
    const key = c.evidenceLinks?.[0]?.url ?? c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetch global breaking news (any topic)
 */
export async function fetchBreakingNews(): Promise<Claim[]> {
  return fetchLiveNews('breaking OR urgent OR developing', 30, '60min');
}

// Geocode articles that don't have coordinates using source country
const COUNTRY_COORDS: Record<string, GeoCoord> = {
  'IR': { lat: 35.69, lon: 51.39 },
  'US': { lat: 38.90, lon: -77.04 },
  'IL': { lat: 31.77, lon: 35.22 },
  'IQ': { lat: 33.31, lon: 44.37 },
  'RU': { lat: 55.75, lon: 37.62 },
  'CN': { lat: 39.91, lon: 116.40 },
  'GB': { lat: 51.51, lon: -0.13 },
  'FR': { lat: 48.86, lon: 2.35 },
  'DE': { lat: 52.52, lon: 13.41 },
  'SA': { lat: 24.71, lon: 46.68 },
  'AE': { lat: 25.20, lon: 55.27 },
  'SY': { lat: 33.51, lon: 36.29 },
  'LB': { lat: 33.89, lon: 35.50 },
  'PK': { lat: 33.69, lon: 73.04 },
  'IN': { lat: 28.61, lon: 77.21 },
  'JP': { lat: 35.68, lon: 139.69 },
  'KR': { lat: 37.57, lon: 126.98 },
  'UA': { lat: 50.45, lon: 30.52 },
  'TR': { lat: 39.93, lon: 32.86 },
};

function classifyArticle(title: string, tone: number): { type: InfoEventType; severity: SeverityTier } {
  const lower = title.toLowerCase();

  if (lower.includes('breaking') || lower.includes('urgent'))
    return { type: 'narrative_shift', severity: 'high' };
  if (lower.includes('fake') || lower.includes('deepfake') || lower.includes('fabricat'))
    return { type: 'deepfake', severity: 'critical' };
  if (lower.includes('correction') || lower.includes('retract'))
    return { type: 'correction', severity: 'moderate' };
  if (lower.includes('fact check') || lower.includes('verified'))
    return { type: 'verification', severity: 'moderate' };
  if (lower.includes('propaganda') || lower.includes('disinformation'))
    return { type: 'disinfo_state', severity: 'high' };

  // Use tone as a rough proxy: very negative = high severity
  if (tone < -5) return { type: 'narrative_shift', severity: 'high' };
  if (tone < -2) return { type: 'narrative_shift', severity: 'moderate' };

  return { type: 'narrative_shift', severity: 'low' };
}

function articleToClaim(article: GdeltArticle, index: number): Claim {
  const { type, severity } = classifyArticle(article.title, article.tone ?? 0);
  const countryCoord = COUNTRY_COORDS[article.sourcecountry] ?? { lat: 0, lon: 0 };

  // Use article's geocoding if available, otherwise country centroid with jitter
  const jitter = () => (Math.random() - 0.5) * 2; // ±1 degree
  const origin: GeoCoord = {
    lat: (article.lat ?? countryCoord.lat) + jitter() * 0.5,
    lon: (article.lon ?? countryCoord.lon) + jitter() * 0.5,
  };

  const now = new Date();
  const articleDate = article.seendate
    ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'))
    : now;

  return {
    id: `LIVE-${Date.now()}-${index}`,
    scenarioId: 'live',
    headline: article.title,
    body: article.title, // GDELT doesn't return full body
    mediaType: 'article',
    mediaUrl: article.socialimage || undefined,
    infoEventType: type,
    misinfoTaxonomy: [],
    truthScore: 50, // Unknown for live articles
    severityTier: severity,
    origin,
    propagationRadius: 200,
    timestamp: articleDate.toISOString(),
    source: {
      name: article.domain,
      type: 'digital_native',
      country: article.sourcecountry || 'unknown',
      credibilityRating: 50,
      isStateAffiliated: false,
      platform: 'website',
    },
    amplifiers: [],
    propagation: {
      speed: 'steady',
      pattern: 'organic_viral',
      peakVelocity: 1000,
      halfLife: 12,
      crossPlatformHops: 1,
    },
    reach: {
      estimatedImpressions: 0,
      shares: 0,
      engagementRate: 0,
      countriesReached: [article.sourcecountry || 'unknown'],
      languagesSpread: [article.language || 'en'],
    },
    verificationStatus: 'unverified',
    groundTruthSummary: '',
    evidenceLinks: [{
      url: article.url,
      title: article.title,
      sourceReliability: 50,
      verdict: 'inconclusive',
      snippet: `Source: ${article.domain}`,
    }],
  };
}
