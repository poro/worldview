// ============================================================
// The Feed — Configuration Constants
// ============================================================

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
  PROPAGATION_RING_COLOR: 'rgba(233, 30, 99, 0.3)',
  PROPAGATION_RING_ORGANIC: 'rgba(255, 193, 7, 0.3)',
  BOT_EDGE_COLOR: 'rgba(255, 111, 0, 0.5)',
  FOG_COLOR: 'rgba(55, 71, 79, 0.5)',

  // --- Timing ---
  CLAIM_POLL_INTERVAL_MS: 5000,
  PROPAGATION_UPDATE_INTERVAL_MS: 1000,
  NARRATIVE_CHECK_INTERVAL_MS: 10000,

  // --- Scoring (game mode) ---
  CREDIBILITY_START: 50,
  CREDIBILITY_MAX: 100,
  CREDIBILITY_CORRECT_FLAG: 8,
  CREDIBILITY_INCORRECT_FLAG: -12,
  CREDIBILITY_CORRECT_BOOST: 10,
  CREDIBILITY_INCORRECT_BOOST: -20,
  CREDIBILITY_CORRECT_CONTEXT: 15,
  CREDIBILITY_INVESTIGATION_BONUS: 3,

  // --- Feed Panel ---
  FEED_PANEL_MAX_ITEMS: 50,
  FEED_PANEL_AUTO_SCROLL: true,

  // --- Severity marker sizes (px) ---
  SEVERITY_SIZES: {
    critical: 32,
    high: 28,
    moderate: 24,
    low: 20,
    benign: 16,
  } as Record<string, number>,

  // --- Propagation speed multipliers (km/hr growth rate) ---
  PROPAGATION_SPEEDS: {
    explosive: 200,
    fast: 100,
    steady: 50,
    slow: 20,
    contained: 5,
  } as Record<string, number>,
} as const;

// ============================================================
// Multi-Source Feed Configuration
// ============================================================
export const FEED_SOURCES = {
  CMNN_SCRAPER_SUPABASE_URL: 'https://yxwuuluthfhxafxzruny.supabase.co',
  CMNN_SCRAPER_SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4d3V1bHV0aGZoeGFmeHpydW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQ1MjYyNiwiZXhwIjoyMDYzMDI4NjI2fQ.QaETd-TKeIyiFmZDre_lrItyuA1xrdfIYivrBDAkPhA',
  GDELT_TIMEOUT_MS: 8000,
  NEWSAPI_KEY: (import.meta as any).env?.VITE_NEWSAPI_KEY || '',
  CACHE_TTL_MS: 300000, // 5 min
  MAX_ARTICLES: 100,
};
