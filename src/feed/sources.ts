import type { LiveArticle, Claim, GeoCoord, SeverityTier } from './types';
import { articleToClaim } from './types';
import { FEED_SOURCES } from './config';
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

function classifyTitle(title: string): { severity: SeverityTier; category: string } {
  const lower = title.toLowerCase();
  if (lower.match(/kill|dead|death|casualt|bomb|strike|attack|shoot|war /))
    return { severity: 'critical', category: 'kinetic' };
  if (lower.match(/escalat|nuclear|defcon|mobiliz|invasion/))
    return { severity: 'critical', category: 'kinetic' };
  if (lower.match(/missile|drone|rocket|torpedo|naval/))
    return { severity: 'high', category: 'kinetic' };
  if (lower.match(/sanction|tariff|trade|econom|market|oil|crude|stock/))
    return { severity: 'moderate', category: 'economic' };
  if (lower.match(/cyber|hack|breach|internet|network/))
    return { severity: 'high', category: 'kinetic' };
  if (lower.match(/diplomat|negotiat|ceasefire|treaty|summit/))
    return { severity: 'moderate', category: 'economic' };
  if (lower.match(/refugee|humanitarian|civilian|hospital|evacuat/))
    return { severity: 'high', category: 'kinetic' };
  if (lower.match(/deepfake|fake|disinformation|misinformation|propaganda/))
    return { severity: 'high', category: 'disinfo' };
  return { severity: 'low', category: 'news' };
}

function makeArticle(
  id: string,
  title: string,
  sourceName: string,
  origin: GeoCoord,
  timestamp: Date,
  severity: SeverityTier,
  category: string,
  url?: string,
  imageUrl?: string,
): LiveArticle {
  return {
    id,
    headline: title,
    source: sourceName,
    url,
    origin,
    timestamp: timestamp.toISOString(),
    severity,
    category,
    imageUrl,
  };
}

// ============ Unified Source: Supabase news_articles ============

// All sources (GDELT, scraper, NewsAPI) are ingested server-side into one table.
// Client just queries Supabase — fast, reliable, always has data.

const WORLDVIEW_SUPABASE = 'https://mxbfffebroitdogmxolp.supabase.co';
const WORLDVIEW_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc1NjcsImV4cCI6MjA4ODE1MzU2N30.bF6455VlQ50xMz0GS54R7S7ERWA5qpW5-fz-Uq6ziqg';

// Also keep the CMNN scraper as a direct fallback (in case news_articles is empty)
const CMNN_SCRAPER_URL = FEED_SOURCES.CMNN_SCRAPER_SUPABASE_URL;
const CMNN_SCRAPER_KEY = FEED_SOURCES.CMNN_SCRAPER_SUPABASE_KEY;

interface NewsArticle {
  id: number;
  source: string;
  provider: string;
  url: string;
  title: string;
  summary: string | null;
  category: string;
  lat: number | null;
  lon: number | null;
  geo_source: string | null;
  country: string | null;
  severity: string;
  event_type: string;
  published_at: string;
  ingested_at: string;
  image_url: string | null;
  tone: number | null;
}

async function fetchFromUnifiedTable(): Promise<LiveArticle[]> {
  try {
    const res = await fetch(
      `${WORLDVIEW_SUPABASE}/rest/v1/news_articles?order=ingested_at.desc&limit=${FEED_SOURCES.MAX_ARTICLES}`,
      {
        headers: {
          apikey: WORLDVIEW_SUPABASE_KEY,
          Authorization: `Bearer ${WORLDVIEW_SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const articles: NewsArticle[] = await res.json();

    return articles.map((a) => {
      // Use DB lat/lon if available, otherwise geocode from title
      const origin = (a.lat != null && a.lon != null)
        ? { lat: a.lat + jitter() * 0.2, lon: a.lon + jitter() * 0.2 }
        : geocodeTitle(a.title);

      const { severity } = (a.severity)
        ? { severity: mapSeverity(a.severity) }
        : classifyTitle(a.title);

      return makeArticle(
        `news-${a.id}`,
        a.title,
        a.provider || a.source || 'News',
        origin,
        new Date(a.published_at || a.ingested_at),
        severity,
        a.event_type || 'news',
        a.url,
        a.image_url || undefined,
      );
    });
  } catch (err) {
    console.warn('[Feed/Supabase] news_articles failed:', err);
    return [];
  }
}


function mapSeverity(s: string): SeverityTier {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'moderate') return 'moderate';
  if (s === 'low') return 'low';
  return 'low';
}

// Fallback: direct scraper query (in case news_articles table is empty)
interface ScrapedTopic {
  id: number;
  source: string;
  url: string;
  title: string;
  summary: string;
  category: string;
  scraped_at: string;
}

async function fetchScrapedTopicsFallback(): Promise<LiveArticle[]> {
  try {
    const res = await fetch(
      `${CMNN_SCRAPER_URL}/rest/v1/scraped_topics?order=scraped_at.desc&limit=50`,
      {
        headers: {
          apikey: CMNN_SCRAPER_KEY,
          Authorization: `Bearer ${CMNN_SCRAPER_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`Scraper fallback ${res.status}`);
    const topics: ScrapedTopic[] = await res.json();

    return topics.map((t) => {
      const origin = geocodeTitle(t.title);
      const { severity, category } = classifyTitle(t.title);
      return makeArticle(
        `scraper-${t.id}`,
        t.title,
        t.source || 'News',
        origin,
        new Date(t.scraped_at),
        severity,
        t.category || 'news',
        t.url,
      );
    });
  } catch (err) {
    console.warn('[Feed/Scraper Fallback] Failed:', err);
    return [];
  }
}

// ============ Aggregator ============

let cachedResult: { articles: LiveArticle[]; claims: Claim[]; sources: string[]; ts: number } | null = null;

/**
 * Fetch live news from all sources.
 * Returns both raw LiveArticles AND converted Claims (for renderers that need full type).
 */
export async function fetchAllSources(): Promise<{ claims: Claim[]; articles: LiveArticle[]; sources: string[] }> {
  if (cachedResult && Date.now() - cachedResult.ts < FEED_SOURCES.CACHE_TTL_MS) {
    return { claims: cachedResult.claims, articles: cachedResult.articles, sources: cachedResult.sources };
  }

  // Primary: unified news_articles table (has GDELT + scraper + NewsAPI)
  let articles = await fetchFromUnifiedTable();
  const sources: string[] = [];

  if (articles.length > 0) {
    sources.push(`Unified (${articles.length})`);
  } else {
    // Fallback: direct scraper query
    console.warn('[Feed] Unified table empty, falling back to scraper');
    articles = await fetchScrapedTopicsFallback();
    if (articles.length > 0) {
      sources.push(`Scraper fallback (${articles.length})`);
    }
  }

  // Deduplicate
  const seenTitles = new Set<string>();
  const deduped: LiveArticle[] = [];
  for (const article of articles) {
    const normalized = article.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seenTitles.has(normalized)) continue;
    seenTitles.add(normalized);
    deduped.push(article);
  }

  // Convert to Claims for renderers that need the full type
  const claims = deduped.map(articleToClaim);

  cachedResult = { articles: deduped, claims, sources, ts: Date.now() };
  console.log(`[Feed] ${deduped.length} articles from ${sources.join(', ')}`);
  return { claims, articles: deduped, sources };
}
