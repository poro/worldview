#!/usr/bin/env python3
"""GDELT → Supabase news_articles ingestion.

Fetches latest articles from GDELT, geocodes them, and upserts into
the unified news_articles table. Designed to run every 15 minutes via cron.

Usage: python3 ingest-gdelt.py [--minutes 30] [--limit 100] [--dry-run]
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError

# ============ Config ============

SUPABASE_URL = "https://mxbfffebroitdogmxolp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzU2NywiZXhwIjoyMDg4MTUzNTY3fQ.E_bebSkWzdfMRwrlrbwxEsSq7ElmxVzuSCQgJs3fvGE"

GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"

# Queries to run (diverse coverage)
GDELT_QUERIES = [
    "iran OR israel OR war OR conflict OR military",
    "economy OR markets OR trade OR sanctions OR tariffs",
    "AI OR technology OR cyber OR hack",
    "climate OR earthquake OR disaster OR humanitarian",
    "election OR politics OR government OR diplomacy",
]

# ============ Keyword Geocoding ============

KEYWORD_LOCATIONS = [
    (["iran", "tehran", "persian"], 35.7, 51.4, "IR"),
    (["israel", "jerusalem", "tel aviv", "idf"], 31.8, 35.2, "IL"),
    (["gaza", "hamas", "palestinian"], 31.5, 34.5, "PS"),
    (["ukraine", "kyiv", "kiev", "zelensk"], 50.4, 30.5, "UA"),
    (["china", "beijing", "chinese"], 39.9, 116.4, "CN"),
    (["russia", "moscow", "kremlin", "putin"], 55.8, 37.6, "RU"),
    (["washington", "white house", "congress", "senate", "pentagon"], 38.9, -77.0, "US"),
    (["wall street", "nyse", "federal reserve"], 40.7, -74.0, "US"),
    (["london", "parliament", "downing"], 51.5, -0.1, "GB"),
    (["brussels", "nato", "european union"], 50.8, 4.4, "BE"),
    (["syria", "damascus"], 33.5, 36.3, "SY"),
    (["lebanon", "beirut", "hezbollah"], 33.9, 35.5, "LB"),
    (["iraq", "baghdad"], 33.3, 44.4, "IQ"),
    (["north korea", "pyongyang"], 39.0, 125.7, "KP"),
    (["taiwan", "taipei"], 25.0, 121.5, "TW"),
    (["india", "delhi", "mumbai", "modi"], 28.6, 77.2, "IN"),
    (["japan", "tokyo"], 35.7, 139.7, "JP"),
    (["saudi", "riyadh"], 24.7, 46.7, "SA"),
    (["uae", "dubai", "abu dhabi"], 24.5, 54.4, "AE"),
    (["yemen", "houthi", "sanaa"], 15.4, 44.2, "YE"),
    (["turkey", "ankara", "istanbul", "erdogan"], 39.9, 32.9, "TR"),
    (["egypt", "cairo", "suez"], 30.0, 31.2, "EG"),
    (["pakistan", "islamabad"], 33.7, 73.0, "PK"),
    (["south korea", "seoul"], 37.6, 127.0, "KR"),
    (["france", "paris", "macron"], 48.9, 2.3, "FR"),
    (["germany", "berlin"], 52.5, 13.4, "DE"),
    (["mexico", "mexican"], 19.4, -99.1, "MX"),
    (["cuba", "havana"], 23.1, -82.4, "CU"),
    (["africa", "african"], 0.0, 20.0, "ZZ"),
]

# GDELT country codes → coords (fallback)
COUNTRY_COORDS = {
    "US": (38.9, -77.0), "GB": (51.5, -0.1), "FR": (48.9, 2.3),
    "DE": (52.5, 13.4), "RU": (55.8, 37.6), "CN": (39.9, 116.4),
    "JP": (35.7, 139.7), "IN": (28.6, 77.2), "AU": (-34.0, 151.0),
    "CA": (45.4, -75.7), "BR": (-23.5, -46.6), "ZA": (-33.9, 18.4),
    "IR": (35.7, 51.4), "IL": (31.8, 35.2), "SA": (24.7, 46.7),
    "TR": (39.9, 32.9), "EG": (30.0, 31.2), "KR": (37.6, 127.0),
}


def geocode(title: str, source_country: str = "") -> tuple:
    """Geocode an article by title keywords, fallback to country centroid."""
    lower = title.lower()
    for keywords, lat, lon, country in KEYWORD_LOCATIONS:
        if any(kw in lower for kw in keywords):
            return lat, lon, country, "keyword"
    
    if source_country and source_country in COUNTRY_COORDS:
        lat, lon = COUNTRY_COORDS[source_country]
        return lat, lon, source_country, "country"
    
    # Default: Washington DC (US-centric news)
    return 38.9, -77.0, "US", "default"


def classify(title: str, tone: float = 0) -> tuple:
    """Classify severity and event type from title."""
    lower = title.lower()
    
    if re.search(r"kill|dead|death|casualt|bomb|strike|attack|shoot|war ", lower):
        return "critical", "kinetic"
    if re.search(r"escalat|nuclear|defcon|mobiliz|invasion", lower):
        return "critical", "escalation"
    if re.search(r"missile|drone|rocket|torpedo|naval", lower):
        return "high", "kinetic"
    if re.search(r"sanction|tariff|trade|econom|market|oil|crude|stock", lower):
        return "moderate", "economic"
    if re.search(r"cyber|hack|breach|internet", lower):
        return "high", "cyber"
    if re.search(r"diplomat|negotiat|ceasefire|treaty|summit", lower):
        return "moderate", "diplomatic"
    if re.search(r"refugee|humanitarian|civilian|hospital|evacuat", lower):
        return "high", "humanitarian"
    if re.search(r"earthquake|flood|hurricane|tornado|disaster", lower):
        return "high", "humanitarian"
    
    # Tone-based fallback
    if tone < -5:
        return "moderate", "news"
    return "low", "news"


def fetch_gdelt(query: str, minutes: int = 30, limit: int = 50) -> list:
    """Fetch articles from GDELT API."""
    params = urlencode({
        "query": query,
        "mode": "artlist",
        "maxrecords": str(limit),
        "format": "json",
        "timespan": str(minutes),
        "sort": "datedesc",
    })
    url = f"{GDELT_API}?{params}"
    
    try:
        req = Request(url, headers={"User-Agent": "WorldView/1.0"})
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return data.get("articles", [])
    except (URLError, json.JSONDecodeError, TimeoutError) as e:
        print(f"  GDELT fetch failed for '{query[:30]}...': {e}", file=sys.stderr)
        return []


def parse_gdelt_date(datestr: str) -> str:
    """Parse GDELT's weird date format: 20260303T120000Z → ISO."""
    try:
        m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z", datestr)
        if m:
            return f"{m[1]}-{m[2]}-{m[3]}T{m[4]}:{m[5]}:{m[6]}Z"
    except Exception:
        pass
    return datetime.now(timezone.utc).isoformat()


def upsert_articles(articles: list, dry_run: bool = False) -> int:
    """Upsert articles into Supabase news_articles table."""
    if not articles:
        return 0
    
    if dry_run:
        for a in articles[:5]:
            print(f"  [DRY] {a['title'][:80]} | {a.get('severity','?')} | {a.get('lat','?')},{a.get('lon','?')}")
        return len(articles)
    
    # Upsert via Supabase REST API (on conflict url)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/news_articles"
    data = json.dumps(articles).encode()
    
    try:
        req = Request(url, data=data, headers=headers, method="POST")
        with urlopen(req, timeout=10) as resp:
            return len(articles)
    except URLError as e:
        print(f"  Supabase upsert failed: {e}", file=sys.stderr)
        return 0


def main():
    parser = argparse.ArgumentParser(description="GDELT → Supabase news ingestion")
    parser.add_argument("--minutes", type=int, default=30, help="Lookback window (minutes)")
    parser.add_argument("--limit", type=int, default=50, help="Max articles per query")
    parser.add_argument("--dry-run", action="store_true", help="Print without writing")
    args = parser.parse_args()
    
    print(f"[GDELT Ingest] {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"  Window: {args.minutes}min | Limit: {args.limit}/query | Queries: {len(GDELT_QUERIES)}")
    
    all_articles = []
    seen_urls = set()
    
    for i, query in enumerate(GDELT_QUERIES):
        print(f"  [{i+1}/{len(GDELT_QUERIES)}] Fetching: {query[:50]}...")
        raw = fetch_gdelt(query, args.minutes, args.limit)
        print(f"    → {len(raw)} articles")
        
        for article in raw:
            url = article.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            
            title = article.get("title", "").strip()
            if not title:
                continue
            
            tone = article.get("tone", 0)
            source_country = article.get("sourcecountry", "")
            lat, lon, country, geo_src = geocode(title, source_country)
            severity, event_type = classify(title, tone)
            
            all_articles.append({
                "source": "gdelt",
                "provider": article.get("domain", "unknown"),
                "url": url,
                "title": title,
                "summary": None,
                "category": event_type,
                "lat": lat,
                "lon": lon,
                "geo_source": geo_src,
                "country": country,
                "severity": severity,
                "event_type": event_type,
                "published_at": parse_gdelt_date(article.get("seendate", "")),
                "image_url": article.get("socialimage"),
                "tone": tone,
            })
        
        # Brief pause between queries to be polite
        if i < len(GDELT_QUERIES) - 1:
            time.sleep(1)
    
    print(f"  Total unique: {len(all_articles)}")
    
    inserted = upsert_articles(all_articles, args.dry_run)
    print(f"  Upserted: {inserted}")
    print(f"[GDELT Ingest] Done.")


if __name__ == "__main__":
    main()
