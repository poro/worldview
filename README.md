# 🌍 WorldView

**A real-time 3D geospatial command center — Google Earth meets Palantir, in your browser.**

![WorldView](https://img.shields.io/badge/status-live-brightgreen) ![CesiumJS](https://img.shields.io/badge/CesiumJS-1.126-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![License](https://img.shields.io/badge/license-MIT-green)

**Live Demo:** [worldview.game-agents.com](https://worldview.game-agents.com)

---

## What Is This?

WorldView is a browser-based geospatial intelligence dashboard that fuses multiple real-time OSINT data streams against a 3D model of the world. It renders Google Photorealistic 3D Tiles, tracks live commercial and military aircraft, visualizes satellite orbits, displays public CCTV feeds, simulates city traffic, and overlays earthquake data — all with cinematic visual filters you'd expect in a spy thriller.

Built in one night using parallel AI coding agents via [OpenClaw](https://github.com/openclaw/openclaw).

---

## Features

### 🏛️ Google Photorealistic 3D Tiles
- Full photorealistic 3D buildings and terrain worldwide via Google Map Tiles API
- Toggle between Google 3D and standard Cesium imagery
- Cinematic camera angles with 45° tilted views

### ✈️ Live Flight Tracking
- Real-time commercial aircraft positions from [OpenSky Network](https://opensky-network.org)
- Color-coded by altitude (green → cyan → blue → amber → red)
- Click any aircraft for details: callsign, altitude, speed, heading, squawk, origin country
- 15-second update interval

### 🎖️ Military Flight Detection
- Identifies military aircraft by ICAO hex ranges (US Army, USAF, NATO, RAF, and more)
- 45+ callsign pattern matches (RCH, EVAC, DUKE, REAPER, FORTE, AF1, etc.)
- Red-orange diamond icons distinguish military from commercial
- **Military Mode (M):** dims commercial traffic, highlights military aircraft

### 🛰️ Satellite Orbits
- Real-time satellite positions propagated from TLE data via [CelesTrak](https://celestrak.org)
- 5 categories: Space Stations (ISS highlighted), Starlink, Military, Weather, GPS
- Orbital path lines with ground track projections
- Click any satellite for: name, altitude, speed, inclination, NORAD ID

### 📹 Live CCTV Feeds
- 12 public camera feeds placed on the globe at real-world coordinates
- Locations: Times Square, Abbey Road, Shibuya Crossing, Jackson Hole, Hollywood, Miami Beach, ISS Earth View, Dublin, Venice, Prague, Niagara Falls, Austin TX
- Click camera markers to open floating video panels with live feeds
- Dark-themed panels with LIVE indicator and REC badge

### 🚗 City Traffic Simulation
- Particle system driven by OpenStreetMap road networks via [Overpass API](https://overpass-api.de)
- Activates when camera altitude < 10km
- Sequential loading: motorways → trunk → primary → secondary
- Up to 2,500 GPU-accelerated particles via `PointPrimitiveCollection`
- Color-coded by road type

### 🌋 Earthquake Monitoring
- Significant global earthquakes from [USGS](https://earthquake.usgs.gov) (past month)
- Magnitude-sized pulsing markers with radius rings
- Click for details: magnitude, depth, location, time

### 🔫 Visual Filters (Real-time Post-Processing)
| Filter | Key | Description |
|--------|-----|-------------|
| Normal | `1` | Standard view |
| Night Vision | `2` | Green phosphor, noise grain, vignette, bloom |
| FLIR/Thermal | `3` | False-color thermal palette (4 modes: Classic, White-Hot, Black-Hot, Rainbow) |
| CRT | `4` | Scanlines, chromatic aberration, barrel distortion, flicker |
| Enhanced | `5` | Sobel edge detection, high contrast, desaturation |

**All filters have adjustable parameters** via the Effects Panel (⚙️):
- Night Vision: Intensity, Noise, Bloom, Vignette
- FLIR: Sensitivity, Palette, Pixelation
- CRT: Scanlines, Chromatic Aberration, Curvature, Flicker
- Enhanced: Edge Strength, Contrast, Saturation

### ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Q` | Fly to Pentagon, DC |
| `W` | Fly to Kremlin, Moscow |
| `E` | Fly to Times Square, NYC |
| `R` | Fly to Shibuya, Tokyo |
| `Y` | Fly to Eiffel Tower, Paris |
| `U` | Fly to Burj Khalifa, Dubai |
| `I` | Fly to Colosseum, Rome |
| `O` | Fly to Sydney Opera House |
| `F` | Toggle flights |
| `S` | Toggle satellites |
| `M` | Military mode |
| `T` | Toggle traffic |
| `C` | Toggle CCTV cameras |
| `G` | Toggle earthquakes |
| `H` | Toggle HUD |
| `1-5` | Visual filters |
| `/` | Focus search bar |
| `ESC` | Close panels |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| 3D Engine | [CesiumJS](https://cesium.com) |
| 3D Tiles | [Google Map Tiles API](https://developers.google.com/maps/documentation/tile/3d-tiles) |
| Flights | [OpenSky Network API](https://opensky-network.org/apidoc/) |
| Satellites | [CelesTrak](https://celestrak.org) + [satellite.js](https://github.com/shashwatak/satellite-js) |
| Roads | [Overpass API](https://overpass-api.de) (OpenStreetMap) |
| Earthquakes | [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) |
| Build | [Vite](https://vitejs.dev) + TypeScript |
| Styling | Tailwind CSS |
| Hosting | [Vercel](https://vercel.com) (Edge Functions for API proxying) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A [Cesium Ion](https://ion.cesium.com) access token (free)
- A [Google Maps Platform](https://console.cloud.google.com) API key with Map Tiles API enabled

### Install & Run

```bash
git clone https://github.com/poro/worldview.git
cd worldview
npm install
npm run dev
```

Open http://localhost:5173

### Environment

The Cesium Ion token and Google API key are set in `src/globe/viewer.ts`. For production, these should be environment variables.

### Build

```bash
npm run build
```

Static output in `dist/`. Deploy anywhere — Vercel, Netlify, S3, etc.

### API Proxying

In development, Vite proxies handle CORS for external APIs (OpenSky, CelesTrak, USGS). In production (Vercel), Edge Functions in `/api/` handle proxying:

- `/api/opensky` → OpenSky Network
- `/api/celestrak` → CelesTrak
- `/api/usgs` → USGS Earthquake Feed

---

## Architecture

```
worldview/
├── api/                    # Vercel Edge Functions (API proxies)
│   ├── opensky.ts          # Flight data proxy
│   ├── celestrak.ts        # Satellite TLE proxy
│   └── usgs.ts             # Earthquake data proxy
├── src/
│   ├── main.ts             # Entry point, keyboard bindings, system init
│   ├── style.css           # Tailwind + custom dark theme
│   ├── globe/
│   │   └── viewer.ts       # CesiumJS viewer, Google 3D Tiles, camera utils
│   ├── flights/
│   │   ├── api.ts          # OpenSky API client
│   │   ├── tracker.ts      # Flight entity management, polling, rendering
│   │   ├── military.ts     # Military ICAO ranges + callsign detection
│   │   └── types.ts        # Flight data types
│   ├── satellites/
│   │   ├── tle.ts          # CelesTrak TLE fetcher/parser
│   │   ├── propagator.ts   # satellite.js orbit propagation
│   │   └── renderer.ts     # Satellite entity rendering + orbit paths
│   ├── traffic/
│   │   └── particles.ts    # OSM road network particle system
│   ├── cctv/
│   │   └── feeds.ts        # Public webcam feed integration
│   ├── filters/
│   │   ├── shaders.ts      # GLSL fragment shaders (NV, FLIR, CRT, Enhanced)
│   │   └── manager.ts      # PostProcessStage management + uniforms
│   ├── osint/
│   │   └── earthquakes.ts  # USGS earthquake data layer
│   ├── ui/
│   │   ├── hud.ts          # Heads-up display (time, coords, stats)
│   │   ├── panel.ts        # Detail panel for selected entities
│   │   ├── controls.ts     # Layer toggles, filter bar, nav presets, toast
│   │   ├── effects.ts      # Shader parameter sliders panel
│   │   └── search.ts       # Location search
│   └── utils/
│       ├── time.ts         # Time formatting
│       └── format.ts       # Number/altitude formatting
├── vite.config.ts          # Vite + Cesium plugin + dev proxies
├── package.json
└── tsconfig.json
```

---

## How It Was Built

WorldView was built in a single night using **parallel AI coding agents** orchestrated via [OpenClaw](https://github.com/openclaw/openclaw):

1. **Phase 1** (1 agent, ~90 min): Core globe, flight tracking, satellite orbits, visual filters, earthquake data, command center UI
2. **Phase 2** (3 agents in parallel, ~30 min):
   - Agent 1: Google 3D Tiles + quick navigation presets
   - Agent 2: Traffic particle system + military flight filtering
   - Agent 3: CCTV camera feeds + shader parameter sliders

Total: **~2 hours of wall clock time**, ~5 hours equivalent of serial development, **2,500+ lines of code**.

Inspired by [Bilawal Sidhu](https://twitter.com/bilawalsidhu)'s WorldView project and his approach to multi-agent "vibe coding."

---

## Data Sources & Attribution

| Source | Data | Rate Limits | Auth |
|--------|------|-------------|------|
| OpenSky Network | Live ADS-B aircraft | 10 req/10s (anonymous) | None required |
| CelesTrak | Satellite TLE orbital data | Reasonable use | None required |
| USGS | Earthquake data | No limit | None required |
| Overpass API | OpenStreetMap road networks | ~10K req/day | None required |
| Google Map Tiles | Photorealistic 3D tiles | Pay-per-use (free tier available) | API key required |
| Cesium Ion | Terrain + base imagery | Free tier: 50K tiles/mo | Token required |

---

## License

MIT

---

## Contributing

Issues and PRs welcome. If you add a new data layer, please follow the existing pattern:
1. Create a module in `src/` with fetch + render logic
2. Add a toggle key in `src/main.ts`
3. Add a layer button in `src/ui/controls.ts`
4. Add stats to `src/ui/hud.ts`
5. Update this README

---

*Built with ☕ and an army of AI agents.*
