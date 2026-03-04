# WORLDVIEW

Real-time geospatial intelligence platform built on CesiumJS.

## Features

### Data Layers
- **ADS-B Flights** — 1,500+ aircraft globally via server-side aggregation
- **Satellites** — Live orbital positions from CelesTrak
- **Maritime (AIS)** — Ship tracking
- **Earthquakes** — USGS real-time seismic data
- **CCTV Feeds** — Live camera overlays
- **GPS Interference** — Jamming/spoofing zones
- **Strike Markers** — Confirmed strike locations
- **No-Fly Zones** — Active airspace restrictions
- **Shipping Lanes** — Major maritime routes
- **Event Cards** — Geo-anchored conflict events

### Intelligence Feed (The Feed)
- Multi-source news ingestion (CMNN scraper + GDELT + NewsAPI)
- Live news ticker (Bloomberg-style bottom crawler)
- Threat assessment bar (DEFCON, threat level, event count)
- Scenario replay (Epic Fury wargame)
- Information fog overlay
- Network graph visualization

### Visual System
- 5 visual filters (Normal, Night Vision, FLIR, CRT, Enhanced)
- Boot splash with progress
- Data source health indicators
- Scanlines + vignette overlays
- Google 3D Tiles integration

### Architecture
- **Event Bus** — Decoupled system communication (`bus.ts`)
- **Smart Intervals** — Tab-visibility-aware timers (`tick.ts`)
- **Pick Registry** — Extensible entity selection (`picking.ts`)
- **Lazy Loading** — Layers initialize on first toggle
- **Server-Side Flights** — systemd timer aggregates 26 regions every 15s

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F | Flights |
| S | Satellites |
| B | Maritime |
| G | Earthquakes |
| N | Live News Feed |
| M | Military Filter |
| 1-5 | Visual Filters |
| H | HUD Toggle |
| A | News Ticker |
| / | Command Palette |
| ? | Help Overlay |
| P | Iran Theater |
| Esc | Close / Deselect |

## Development

```bash
npm install
npm run dev     # Vite dev server
npm run build   # Production build
```

## Data Pipeline

```
CMNN Scraper (cron: hourly)
    → scraped_topics (CMNN Supabase)
    → ingest-scraper.py (cron: 30min)
    → news_articles (WorldView Supabase)
    → Client fetch → Ticker + Globe

GDELT (cron: 15min, unreliable)
    → ingest-gdelt.py
    → news_articles (WorldView Supabase)

ADS-B (systemd timer: 15s)
    → flight-aggregator.py
    → public/flights.json
    → Client fetch (single request)
```

## Stack

- **Frontend:** TypeScript + CesiumJS + Vite
- **Database:** Supabase (PostgreSQL)
- **Data:** adsb.fi, CelesTrak, USGS, GDELT, CMNN scraper
- **Hosting:** Cloudflare Tunnel → Vite dev server

---

*Endless Games & Learning Lab — Arizona State University*
