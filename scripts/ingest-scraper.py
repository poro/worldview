#!/usr/bin/env python3
"""Ingest news from CMNN scraper Supabase → WorldView news_articles table.

Pulls from CMNN's scraped_topics (yxwuuluthfhxafxzruny) and inserts
into WorldView's news_articles (mxbfffebroitdogmxolp).
"""

import json
import sys
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

# CMNN Scraper Supabase
CMNN_URL = "https://yxwuuluthfhxafxzruny.supabase.co"
CMNN_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4d3V1bHV0aGZoeGFmeHpydW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQ1MjYyNiwiZXhwIjoyMDYzMDI4NjI2fQ.QaETd-TKeIyiFmZDre_lrItyuA1xrdfIYivrBDAkPhA"

# WorldView Supabase
WV_URL = "https://mxbfffebroitdogmxolp.supabase.co"
WV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmZmZmVicm9pdGRvZ214b2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NzU2NywiZXhwIjoyMDg4MTUzNTY3fQ.E_bebSkWzdfMRwrlrbwxEsSq7ElmxVzuSCQgJs3fvGE"

# Simple geocoding for common locations in headlines
GEO_MAP = {
    'iran': (51.4, 35.7), 'tehran': (51.4, 35.7), 'iraq': (44.4, 33.3),
    'syria': (36.3, 33.5), 'israel': (35.2, 31.8), 'gaza': (34.5, 31.5),
    'ukraine': (30.5, 50.4), 'kyiv': (30.5, 50.4), 'russia': (37.6, 55.8),
    'moscow': (37.6, 55.8), 'china': (116.4, 39.9), 'beijing': (116.4, 39.9),
    'taiwan': (121.0, 25.0), 'north korea': (125.8, 39.0), 'yemen': (44.2, 15.4),
    'saudi': (46.7, 24.7), 'turkey': (32.9, 39.9), 'afghanistan': (69.2, 34.5),
    'pakistan': (73.0, 33.7), 'india': (77.2, 28.6), 'japan': (139.7, 35.7),
    'south korea': (127.0, 37.6), 'washington': (-77.0, 38.9), 'pentagon': (-77.1, 38.9),
    'new york': (-74.0, 40.7), 'london': (-0.1, 51.5), 'paris': (2.4, 48.9),
    'berlin': (13.4, 52.5), 'nato': (4.4, 50.8), 'brussels': (4.4, 50.8),
    'strait of hormuz': (56.3, 26.6), 'persian gulf': (52.0, 27.0),
    'red sea': (38.0, 20.0), 'suez': (32.3, 30.0),
}

def geocode(title: str) -> tuple:
    lower = title.lower()
    for place, coords in GEO_MAP.items():
        if place in lower:
            return coords
    # Default: random US location
    import random
    return (-95 + random.uniform(-10, 10), 38 + random.uniform(-5, 5))

def classify_severity(title: str) -> str:
    lower = title.lower()
    if any(w in lower for w in ['kill', 'dead', 'bomb', 'strike', 'attack', 'war', 'nuclear', 'invasion']):
        return 'critical'
    if any(w in lower for w in ['missile', 'drone', 'military', 'cyber', 'hack', 'sanction']):
        return 'high'
    if any(w in lower for w in ['tariff', 'trade', 'election', 'summit', 'diplomat']):
        return 'moderate'
    return 'low'

def fetch_json(url: str, headers: dict) -> any:
    req = Request(url, headers=headers)
    with urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def post_json(url: str, headers: dict, data: list) -> int:
    body = json.dumps(data).encode()
    req = Request(url, data=body, headers={**headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates'}, method='POST')
    with urlopen(req, timeout=15) as resp:
        return resp.status

def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 50

    # Fetch recent scraped topics from CMNN
    topics_url = f"{CMNN_URL}/rest/v1/scraped_topics?order=scraped_at.desc&limit={limit}"
    headers = {'apikey': CMNN_KEY, 'Authorization': f'Bearer {CMNN_KEY}'}

    try:
        topics = fetch_json(topics_url, headers)
    except Exception as e:
        print(f"[Scraper→WV] Failed to fetch topics: {e}")
        return

    if not topics:
        print("[Scraper→WV] No topics found")
        return

    # Transform to news_articles format
    articles = []
    for t in topics:
        lon, lat = geocode(t.get('title', ''))
        articles.append({
            'title': t['title'],
            'url': t.get('url', ''),
            'source': t.get('source', 'Unknown'),
            'provider': 'cmnn-scraper',
            'published_at': t.get('scraped_at', datetime.now(timezone.utc).isoformat()),
            'ingested_at': datetime.now(timezone.utc).isoformat(),
            'lat': lat,
            'lon': lon,
            'severity': classify_severity(t['title']),
            'event_type': t.get('category', 'news'),
            'country': 'US',
        })

    # Insert into WorldView
    wv_headers = {'apikey': WV_KEY, 'Authorization': f'Bearer {WV_KEY}'}
    try:
        status = post_json(f"{WV_URL}/rest/v1/news_articles", wv_headers, articles)
        print(f"[Scraper→WV] Inserted {len(articles)} articles (HTTP {status})")
    except Exception as e:
        print(f"[Scraper→WV] Insert failed: {e}")

if __name__ == "__main__":
    main()
