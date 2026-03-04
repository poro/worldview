import type { Claim, GeoCoord, InfoEventType, SeverityTier } from './types';
import { FEED_SOURCES } from './config';
import { fetchConflictNews } from './gdelt';

// ============ Geocoding Map ============
const KEYWORD_LOCATIONS: Array<{ keywords: string[]; lat: number; lon: number }> = [
  { keywords: ['iran', 'tehran', 'persian'], lat: 35.7, lon: 51.4 },
  { keywords: ['israel', 'jerusalem', 'tel aviv', 'idf'], lat: 31.8, lon: 35.2 },
  { keywords: ['gaza', 'hamas', 'palestinian'], lat: 31.5, lon: 34.5 },
  { keywords: ['ukraine', 'kyiv', 'kiev', 'zelensk'], lat: 50.4, lon: 30.5 },
  { keywords: ['china', 'beijing', 'chinese'], lat: 39.9, lon: 116.4 },
  { keywords: ['russia', 'moscow', 'kremlin', 'putin'], lat: 55.8, lon: 37.6 },
  { keywords: ['washington', 'white house', 'congress', 'senate', 'capitol', 'pentagon'], lat: 38.9, lon: -77.0 },
  { keywords: ['wall street', 'nyse', 'fed ', 'federal reserve'], lat: 40.7, lon: -74.0 },
  { keywords: ['london', 'parliament', 'downing'], lat: 51.5, lon: -0.1 },
  { keywords: ['brussels', 'nato', 'european union'], lat: 50.8, lon: 4.4 },
  { keywords: ['syria', 'damascus', 'assad'], lat: 33.5, lon: 36.3 },
  { keywords: ['lebanon', 'beirut', 'hezbollah'], lat: 33.9, lon: 35.5 },
  { keywords: ['iraq', 'baghdad'], lat: 33.3, lon: 44.4 },
  { keywords: ['north korea', 'pyongyang', 'kim jong'], lat: 39.0, lon: 125.7 },
  { keywords: ['taiwan', 'taipei'], lat: 25.0, lon: 121.5 },
  { keywords: ['india', 'delhi', 'mumbai', 'modi'], lat: 28.6, lon: 77.2 },
  { keywords: ['japan', 'tokyo'], lat: 35.7, lon: 139.7 },
  { keywords: ['saudi', 'riyadh'], lat: 24.7, lon: 46.7 },
  { keywords: ['uae', 'dubai', 'abu dhabi', 'emirates'], lat: 24.5, lon: 54.4 },
  { keywords: ['africa', 'african'], lat: 0.0, lon: 20.0 },
  { keywords: ['mexico', 'mexican'], lat: 19.4, lon: -99.1 },
  { keywords: ['cuba', 'havana'], lat: 23.1, lon: -82.4 },
  { keywords: ['yemen', 'houthi', 'sanaa'], lat: 15.4, lon: 44.2 },
  { keywords: ['turkey', 'ankara', 'istanbul', 'erdogan'], lat: 39.9, lon: 32.9 },
  { keywords: ['egypt', 'cairo', 'suez'], lat: 30.0, lon: 31.2 },
  { keywords: ['pakistan', 'islamabad', 'karachi'], lat: 33.7, lon: 73.0 },
  { keywords: ['south korea', 'seoul'], lat: 37.6, lon: 127.0 },
  { keywords: ['france', 'paris', 'macron'], lat: 48.9, lon: 2.3 },
  { keywords: ['germany', 'berlin', 'scholz'], lat: 52.5, lon: 13.4 },
];

const US_DEFAULTS = [
  { lat: 38.9, lon: -77.0 },
  { lat: 40.7, lon: -74.0 },
  { lat: 34.0, lon: -118.2 },
  { lat: 41.9, lon: -87.6 },
  { lat: 29.8, lon: -95.4 },
];

function jitter(): number {
  return (Math.random() - 0.5) * 2;
}

function geocodeTitle(title: string): GeoCoord {
  const lower = title.toLowerCase();
  for (const entry of KEYWORD_LOCATIONS) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { lat: entry.lat + jitter() * 0.5, lon: entry.lon + jitter() * 0.5 };
    }
  }
  const def = US_DEFAULTS[Math.floor(Math.random() * US_DEFAULTS.length)];
  return { lat: def.lat + jitter() * 1.0, lon: def.lon + jitter() * 1.0 };
}

function classifyTitle(title: string): { type: InfoEventType; severity: SeverityTier } {
  const lower = title.toLowerCase();
  if (lower.match(/kill|dead|death|casualt|bomb|strike|attack|shoot|war /))
    return { type: 'verification', severity: 'critical' };
  if (lower.match(/escalat|nuclear|defcon|mobiliz|invasion/))
    return { type: 'verification', severity: 'critical' };
  if (lower.match(/missile|drone|rocket|torpedo|naval/))
    return { type: 'verification', severity: 'high' };
  if (lower.match(/sanction|tariff|trade|econom|market|oil|crude|stock/))
    return { type: 'verification', severity: 'moderate' };
  if (lower.match(/cyber|hack|breach|internet|network/))
    return { type: 'verification', severity: 'high' };
  if (lower.match(/diplomat|negotiat|ceasefire|treaty|summit/))
    return { type: 'verification', severity: 'moderate' };
  if (lower.match(/refugee|humanitarian|civilian|hospital|evacuat/))
    return { type: 'verification', severity: 'high' };
  if (lower.match(/deepfake|fake|disinformation|misinformation|propaganda/))
    return { type: 'deepfake', severity: 'high' };
  return { type: 'verification', severity: 'low' };
}

function makeClaim(
  id: string,
  title: string,
  sourceName: string,
  sourceCountry: string,
  origin: GeoCoord,
  timestamp: Date,
  type: InfoEventType,
  severity: SeverityTier,
  url?: string,
): Claim {
  return {
    id,
    scenarioId: 'live',
    headline: title,
    body: title,
    mediaType: 'article',
    mediaUrl: undefined,
    infoEventType: type,
    misinfoTaxonomy: [],
    truthScore: 50,
    severityTier: severity,
    origin,
    propagationRadius: 200,
    timestamp: timestamp.toISOString(),
    source: {
      name: sourceName,
      type: 'digital_native',
      country: sourceCountry,
      credibilityRating: 60,
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
      countriesReached: [sourceCountry],
      languagesSpread: ['en'],
    },
    verificationStatus: 'unverified' as const,
    groundTruthSummary: '',
    evidenceLinks: [],
  };
}

// ============ Source: CMNN Scraped Topics ============

interface ScrapedTopic {
  id: number;
  source: string;
  url: string;
  title: string;
  summary: string;
  category: string;
  scraped_at: string;
}

async function fetchScrapedTopics(): Promise<Claim[]> {
  try {
    const res = await fetch(
      `${FEED_SOURCES.CMNN_SCRAPER_SUPABASE_URL}/rest/v1/scraped_topics?order=scraped_at.desc&limit=50`,
      {
        headers: {
          apikey: FEED_SOURCES.CMNN_SCRAPER_SUPABASE_KEY,
          Authorization: `Bearer ${FEED_SOURCES.CMNN_SCRAPER_SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const topics: ScrapedTopic[] = await res.json();

    return topics.map((t, i) => {
      const origin = geocodeTitle(t.title);
      const { type, severity } = classifyTitle(t.title);
      return makeClaim(
        `scraper-${t.id}`,
        t.title,
        t.source || 'News',
        'US',
        origin,
        new Date(t.scraped_at),
        type,
        severity,
        t.url,
      );
    });
  } catch (err) {
    console.warn('[Feed/Scraper] Failed:', err);
    return [];
  }
}

// ============ Source: NewsAPI ============

interface NewsApiArticle {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

async function fetchNewsApi(): Promise<Claim[]> {
  const key = FEED_SOURCES.NEWSAPI_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=30&apiKey=${key}`
    );
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const data = await res.json();
    const articles: NewsApiArticle[] = data.articles || [];

    return articles.map((a, i) => {
      const origin = geocodeTitle(a.title);
      const { type, severity } = classifyTitle(a.title);
      return makeClaim(
        `newsapi-${i}-${Date.now()}`,
        a.title,
        a.source?.name || 'NewsAPI',
        'US',
        origin,
        new Date(a.publishedAt),
        type,
        severity,
        a.url,
      );
    });
  } catch (err) {
    console.warn('[Feed/NewsAPI] Failed:', err);
    return [];
  }
}

// ============ Source: GDELT (existing) ============

async function fetchGdeltSource(): Promise<Claim[]> {
  try {
    // Wrap in a race with timeout
    const result = await Promise.race([
      fetchConflictNews(),
      new Promise<Claim[]>(resolve =>
        setTimeout(() => resolve([]), FEED_SOURCES.GDELT_TIMEOUT_MS)
      ),
    ]);
    return result;
  } catch (err) {
    console.warn('[Feed/GDELT] Failed:', err);
    return [];
  }
}

// ============ Aggregator ============

interface SourceResult {
  name: string;
  claims: Claim[];
}

let cachedResult: { claims: Claim[]; sources: string[]; ts: number } | null = null;

export async function fetchAllSources(): Promise<{ claims: Claim[]; sources: string[] }> {
  if (cachedResult && Date.now() - cachedResult.ts < FEED_SOURCES.CACHE_TTL_MS) {
    return { claims: cachedResult.claims, sources: cachedResult.sources };
  }

  const results = await Promise.allSettled([
    fetchScrapedTopics().then(claims => ({ name: 'Scraper', claims } as SourceResult)),
    fetchGdeltSource().then(claims => ({ name: 'GDELT', claims } as SourceResult)),
    fetchNewsApi().then(claims => ({ name: 'NewsAPI', claims } as SourceResult)),
  ]);

  const allClaims: Claim[] = [];
  const activeSources: string[] = [];
  const seenTitles = new Set<string>();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { name, claims } = result.value;
    if (claims.length === 0) continue;
    activeSources.push(`${name} (${claims.length})`);

    for (const claim of claims) {
      const normalized = claim.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seenTitles.has(normalized)) continue;
      seenTitles.add(normalized);
      allClaims.push(claim);
    }
  }

  // Sort by timestamp descending
  allClaims.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const capped = allClaims.slice(0, FEED_SOURCES.MAX_ARTICLES);

  cachedResult = { claims: capped, sources: activeSources, ts: Date.now() };
  console.log(`[Feed] ${capped.length} articles from ${activeSources.join(', ')}`);
  return { claims: capped, sources: activeSources };
}
