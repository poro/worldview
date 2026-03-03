# WorldView — Product Requirements Document

**Version:** 2.0 (March 3, 2026)
**Status:** Live at [worldview.game-agents.com](https://worldview.game-agents.com)
**Author:** Mark Ollila / Endless Games and Learning Lab (ASU)
**Built with:** [OpenClaw](https://github.com/openclaw/openclaw) parallel AI coding agents

---

## 1. Executive Summary

**WorldView** is a browser-based 3D geospatial intelligence platform — Google Earth meets Palantir. It fuses real-time OSINT data streams (live flight tracking, satellite orbits, maritime AIS, public CCTV, earthquake monitoring, road traffic simulation) against a CesiumJS 3D globe with Google Photorealistic Tiles. Military-grade visual filters (Night Vision, FLIR/Thermal, CRT, Enhanced Edge Detection) and a timeline replay system enable both real-time monitoring and historical event analysis.

The current scenario implementation models **Operation Epic Fury / Operation Roaring Lion** — the US-Israeli strike campaign against Iran (Feb–Mar 2026) — with 30+ geolocated conflict events, strike coordinates, airspace closures, GPS interference zones, shipping lane disruptions, and an intelligence preparation timeline spanning from 2001 to H-hour.

WorldView was built in a single night (~2 hours wall clock) using parallel AI coding agents, with ongoing enhancements over the following week.

---

## 2. Problem Statement

Existing geospatial tools fall into two categories:
- **Consumer** (Google Earth, Google Maps): Beautiful 3D rendering but no real-time data fusion, no military overlays, no timeline replay
- **Enterprise** (Palantir Gotham, Esri ArcGIS): Powerful but expensive ($100K+/year), locked behind government contracts, not browser-native

There is no open-source, browser-based tool that combines cinematic 3D globe rendering with real-time multi-source intelligence fusion, visual filters, and timeline-based event replay — accessible to anyone with a web browser.

---

## 3. Target Users

| Persona | Description | Primary Use |
|---|---|---|
| **OSINT Analyst** | Open-source intelligence researcher tracking conflicts, military movements | Real-time flight/maritime tracking, event timeline analysis |
| **Educator** | University instructor teaching geopolitics, military strategy, or GIS | Interactive scenario replay, visual demonstration |
| **Journalist** | Reporter covering conflicts, natural disasters, or geopolitical events | Visualization of event sequences, screenshot/recording |
| **Game Designer** | Designing realistic wargames or simulations | Reference for authentic C2 interfaces, data structure patterns |
| **Hobbyist** | Aviation enthusiast, satellite tracker, geopolitics follower | Real-time tracking, visual filters, exploration |

---

## 4. Product Architecture

### 4.1 Tech Stack

| Component | Technology |
|---|---|
| 3D Engine | CesiumJS 1.126 |
| 3D Tiles | Google Map Tiles API (Photorealistic) |
| Language | TypeScript 5.7 |
| Build | Vite |
| Styling | Tailwind CSS (dark command-center theme) |
| Flights | OpenSky Network REST API |
| Satellites | CelesTrak TLE + satellite.js (SGP4 propagation) |
| Maritime | AIS data + military MMSI detection |
| Earthquakes | USGS Earthquake API |
| Roads | Overpass API (OpenStreetMap) |
| Hosting | Vercel (Edge Functions for API proxying) |

### 4.2 Source Tree

```
worldview/
├── api/                        # Vercel Edge Functions (CORS proxies)
│   ├── opensky.ts              # Flight data proxy
│   ├── celestrak.ts            # Satellite TLE proxy
│   └── usgs.ts                 # Earthquake data proxy
├── public/data/
│   ├── countries.geojson       # Country borders (3MB)
│   └── borders.geojson         # Simplified borders (333KB)
├── reference/                  # Panoptix UI reference images + teardown PDF
├── src/
│   ├── main.ts                 # Entry point, keyboard bindings, system init (~600 LOC)
│   ├── config.ts               # All configuration constants
│   ├── style.css               # Tailwind + custom dark theme
│   ├── overlay-config.ts       # Overlay layer configuration
│   │
│   ├── globe/
│   │   └── viewer.ts           # CesiumJS viewer, Google 3D Tiles, camera utils
│   │
│   ├── flights/
│   │   ├── api.ts              # OpenSky API client
│   │   ├── tracker.ts          # Flight entity management, polling, SVG icons
│   │   ├── military.ts         # Military ICAO hex ranges + 45+ callsign patterns
│   │   └── types.ts            # Flight data types
│   │
│   ├── satellites/
│   │   ├── tle.ts              # CelesTrak TLE fetcher/parser
│   │   ├── propagator.ts       # satellite.js SGP4 orbit propagation
│   │   └── renderer.ts         # Satellite rendering + orbit paths + footprints
│   │
│   ├── maritime/
│   │   ├── api.ts              # AIS data client
│   │   ├── tracker.ts          # Vessel entity management
│   │   ├── military.ts         # Military MMSI detection by country
│   │   └── types.ts            # Maritime data types
│   │
│   ├── traffic/
│   │   └── particles.ts        # OSM road network GPU particle system (2,500 particles)
│   │
│   ├── cctv/
│   │   └── feeds.ts            # 12 public webcam feeds at real-world coordinates
│   │
│   ├── data/                   # Static scenario data (Operation Epic Fury)
│   │   ├── events.ts           # 30+ conflict events (kinetic, retaliation, intel, cyber, etc.)
│   │   ├── strikes.ts          # Strike coordinates with blast radii
│   │   ├── airspace.ts         # Airspace closure zones (Iran, Iraq, Gulf states)
│   │   ├── gps-interference.ts # GPS jamming/spoofing zones
│   │   └── shipping.ts         # Shipping lane status + chokepoints (Hormuz, Bab el-Mandeb)
│   │
│   ├── osint/                  # OSINT overlay renderers
│   │   ├── strikes.ts          # Strike marker + blast ring rendering
│   │   ├── airspace.ts         # No-fly zone polygon rendering
│   │   ├── gps-interference.ts # GPS interference zone rendering
│   │   ├── shipping.ts         # Shipping lane polyline rendering
│   │   └── earthquakes.ts      # USGS earthquake markers
│   │
│   ├── layers/                 # Visual overlay layers
│   │   ├── event-cards.ts      # HTML overlay event cards (Panoptix-style)
│   │   ├── hex-bins.ts         # Hexagonal heat map binning
│   │   ├── countries.ts        # Country border rendering
│   │   └── internet-blackout.ts # Internet blackout zone rendering
│   │
│   ├── filters/                # Post-processing visual filters
│   │   ├── shaders.ts          # GLSL fragment shaders (NV, FLIR, CRT, Enhanced)
│   │   └── manager.ts          # PostProcessStage management + uniforms
│   │
│   ├── time/                   # Timeline & replay system
│   │   ├── controller.ts       # Time state machine (LIVE / REPLAY modes)
│   │   └── data-adapter.ts     # Event → timeline marker adapter
│   │
│   ├── ui/                     # User interface components
│   │   ├── hud.ts              # Heads-up display (time, coords, stats, layer counts)
│   │   ├── panel.ts            # Entity detail panel (left side)
│   │   ├── right-panel.ts      # Right-side info panel
│   │   ├── controls.ts         # Layer toggles, filter bar, nav presets, toasts
│   │   ├── filter-bar.ts       # Visual filter selector bar
│   │   ├── effects.ts          # Shader parameter adjustment sliders
│   │   ├── timeline.ts         # Horizontal timeline with scrubber + playback controls
│   │   ├── zoom-controls.ts    # +/- zoom, location presets, trackpad handling
│   │   ├── aircraft-popup.ts   # Aircraft detail popup on click
│   │   └── view-modes.ts       # Camera view mode selector
│   │
│   ├── viewscout/              # ViewScout module (property viewshed analysis)
│   │   ├── index.ts            # ViewScout entry point
│   │   ├── panel.ts            # ViewScout UI panel
│   │   ├── compute.ts          # Viewshed computation engine
│   │   ├── elevation.ts        # Elevation data fetcher
│   │   ├── overlay.ts          # Viewshed overlay rendering
│   │   ├── score.ts            # View quality scoring
│   │   └── water.ts            # Water body detection
│   │
│   └── utils/
│       ├── time.ts             # Time formatting
│       └── format.ts           # Number/altitude formatting
│
├── SPEC.md                     # Original build specification
├── BUILD-SPEC.md               # Panoptix visual overhaul spec
├── REFINE-SPEC.md              # UI refinement spec
└── PRD-WorldView.md            # This document
```

**Total codebase:** ~9,900 lines of TypeScript across 50+ modules.

---

## 5. Feature Inventory

### 5.1 3D Globe & Rendering

| Feature | Status | Details |
|---|---|---|
| CesiumJS 3D Viewer | ✅ Live | Dark theme, atmosphere, lighting effects |
| Google Photorealistic 3D Tiles | ✅ Live | Full worldwide 3D buildings + terrain |
| Standard Cesium imagery toggle | ✅ Live | Fallback to Bing/OSM imagery |
| Cinematic camera (45° tilt) | ✅ Live | Spy-thriller aesthetic |
| Smooth fly-to navigation | ✅ Live | Keyboard presets (Q/W/E/R/Y/U/I/O) |
| Country borders overlay | ✅ Live | GeoJSON rendering with highlight |

### 5.2 Real-Time Data Layers

| Layer | Source | Update Interval | Status |
|---|---|---|---|
| **Commercial Flights** | OpenSky Network | 15 sec | ✅ Live |
| **Military Flights** | OpenSky + ICAO hex/callsign detection | 15 sec | ✅ Live |
| **Satellites** | CelesTrak TLE + SGP4 propagation | Real-time | ✅ Live |
| **Maritime / AIS** | AIS data + military MMSI detection | Variable | ✅ Live |
| **Earthquakes** | USGS (past month, significant) | On load | ✅ Live |
| **Road Traffic** | Overpass API (OSM) | On camera move (<10km alt) | ✅ Live |
| **CCTV Feeds** | 12 public webcams | Live stream | ✅ Live |

### 5.3 Military & Intelligence Features

| Feature | Status | Details |
|---|---|---|
| Military flight detection | ✅ Live | ICAO hex ranges (US Army, USAF, NATO, RAF, etc.) + 45+ callsign patterns (RCH, EVAC, DUKE, REAPER, FORTE, AF1) |
| Military Mode (M key) | ✅ Live | Dims commercial traffic, highlights military |
| Military vessel detection | ✅ Live | MMSI prefix matching by country navy |
| Strike markers + blast rings | ✅ Live | Operation Epic Fury strike coordinates |
| Airspace closure zones | ✅ Live | Iran, Iraq, Gulf states — NOTAM-based polygons |
| GPS interference zones | ✅ Live | Jamming/spoofing regions with affected area |
| Shipping lane disruption | ✅ Live | Hormuz, Bab el-Mandeb, Suez — lane status |
| Internet blackout zones | ✅ Live | Nationwide comms blackout rendering |
| Intelligence events | ✅ Live | Pre-war intel timeline (camera compromise, HUMINT, pattern-of-life) |
| Cyber events | ✅ Live | Radar disruption, cell tower jamming |

### 5.4 Visual Filters (Real-Time Post-Processing)

| Filter | Key | Description |
|---|---|---|
| Normal | `1` | Standard satellite imagery |
| Night Vision | `2` | Green phosphor, noise grain, vignette, bloom |
| FLIR/Thermal | `3` | False-color thermal palette (4 modes: Classic, White-Hot, Black-Hot, Rainbow) |
| CRT | `4` | Scanlines, chromatic aberration, barrel distortion, flicker |
| Enhanced | `5` | Sobel edge detection, high contrast, desaturation |

All filters have adjustable parameters via Effects Panel (⚙️): intensity, noise, bloom, vignette, sensitivity, palette, pixelation, scanlines, curvature, flicker, edge strength, contrast, saturation.

### 5.5 Timeline & Replay System

| Feature | Status | Details |
|---|---|---|
| Horizontal timeline bar | ✅ Live | Scrubber, playback controls, date picker |
| Event markers on timeline | ✅ Live | Color-coded by event type |
| LIVE / REPLAY modes | ✅ Live | Switch between real-time and historical |
| Time-aware data layers | ✅ Live | Flights, satellites, maritime query historical data in replay |
| Playback speed control | ✅ Live | 1x, 2x, 4x, 10x |

### 5.6 Event Types (Timeline)

| Type | Color | Description |
|---|---|---|
| `kinetic` | Red | Airstrikes, missile strikes, ground operations |
| `retaliation` | Amber | Enemy response strikes, rocket barrages |
| `civilian_impact` | Orange | Civilian casualties, hospital damage, blackouts |
| `infrastructure` | Dark orange | Oil facilities, refineries, undersea cables |
| `escalation` | Magenta | DEFCON changes, diplomatic events, nuclear alerts |
| `maritime` | Cyan | Naval movements, strait closures, tanker attacks |
| `intelligence` | Green | Pre-war surveillance, HUMINT, pattern-of-life analysis |
| `cyber` | Purple | Cyber ops, radar disruption, cell tower jamming |

### 5.7 Scenario: Operation Epic Fury / Roaring Lion

The current implementation models the US-Israeli strike campaign against Iran:

**Pre-War Intelligence (2001–2026):**
- Mossad Iran priority directive (2001)
- Tehran traffic camera network compromise (years-long)
- Oct 7, 2023 — calculus shift on targeting heads of state
- Pattern-of-life analysis completion on Khamenei compound
- US cyber ops disabling radar + comms
- Cell tower jamming on Pasteur Street, Tehran
- HUMINT confirmation of meeting in progress

**Day 1 — H-Hour (Feb 28, 2026):**
- DEFCON 2 declared
- SEAD opening salvo (S-300/Bavar-373 suppression)
- Nuclear facility strikes (Natanz, Isfahan, Fordow, Parchin)
- Operation Roaring Lion — Supreme Leader killed via PGM strike
- Bandar Abbas naval strikes
- Tehran blackout

**Day 2 — Retaliation (Mar 1):**
- IRGC ballistic missile launches toward Iraq
- Houthi cruise missile salvo in Red Sea
- Hormuz closure threat + mine deployment
- Hezbollah 200+ rocket barrage on northern Israel
- USS Eisenhower CSG enters Arabian Sea

**Day 3 — Escalation (Mar 2):**
- Mashhad drone base strike
- F-15E crash over Zagros Mountains
- IRGC Shahed-136 drone swarm toward Al Udeid
- Russia warns "catastrophic consequences"
- Greek tanker struck in Gulf of Oman
- Undersea cables severed near Fujairah
- UN emergency session

### 5.8 ViewScout Module

Embedded property viewshed analysis tool:
- Elevation data fetching and terrain analysis
- Line-of-sight computation from any coordinate
- Water body detection (ocean, lake)
- View quality scoring algorithm
- Viewshed overlay rendering on globe
- Interactive UI panel for property analysis

### 5.9 UI Components

| Component | Description |
|---|---|
| HUD | Time, coordinates, altitude, layer counts, connection status |
| Detail Panel (left) | Click-to-inspect for aircraft, vessels, satellites, events |
| Right Panel | Contextual information, event lists |
| Filter Bar | Visual filter selection + Effects parameter panel |
| Timeline | Horizontal scrubber, playback controls, event markers |
| Zoom Controls | +/- buttons, location presets, double-click zoom |
| Aircraft Popup | Rich popup with callsign, altitude, speed, heading, squawk |
| Event Cards | Panoptix-style HTML overlays floating above map positions |
| Toast System | Notification toasts for state changes |
| Search | Location search with fly-to |

### 5.10 Keyboard Shortcuts

| Key | Action | | Key | Action |
|-----|--------|-|-----|--------|
| `Q` | Pentagon, DC | | `F` | Toggle flights |
| `W` | Kremlin, Moscow | | `S` | Toggle satellites |
| `E` | Times Square, NYC | | `M` | Military mode |
| `R` | Shibuya, Tokyo | | `T` | Toggle traffic |
| `Y` | Eiffel Tower, Paris | | `C` | Toggle CCTV |
| `U` | Burj Khalifa, Dubai | | `G` | Toggle earthquakes |
| `I` | Colosseum, Rome | | `H` | Toggle HUD |
| `O` | Sydney Opera House | | `1-5` | Visual filters |
| `/` | Focus search | | `ESC` | Close panels |

---

## 6. Data Sources & APIs

| Source | Data | Auth | Rate Limits |
|---|---|---|---|
| OpenSky Network | Live ADS-B aircraft positions | None (anonymous) | 10 req/10s |
| CelesTrak | Satellite TLE orbital elements | None | Reasonable use |
| USGS | Earthquake feed (GeoJSON) | None | Unlimited |
| Overpass API | OpenStreetMap road networks | None | ~10K req/day |
| Google Map Tiles | Photorealistic 3D tiles | API key | Pay-per-use (free tier) |
| Cesium Ion | World terrain + base imagery | Token (free tier) | 50K tiles/month |
| Polygon.io | Financial data (for WorldView Recorder) | API key | Per plan |

---

## 7. Companion Projects

### 7.1 WorldView Recorder (`projects/worldview-recorder/`)
- SQLite database capturing flight snapshots for replay
- Enables historical data queries when timeline is in REPLAY mode
- API at `localhost:3020`

### 7.2 Operation Epic Fury Wargame (`projects/wargame/`)
- Separate CesiumJS-based interactive wargame
- Uses WorldView's scenario data as foundation
- Adds force disposition, SAM rings, order of battle panel
- Full intelligence reference at `reference/operation-epic-fury-intel.md`

---

## 8. Deployment

- **Production:** Vercel (automatic deploys from git)
- **Domain:** worldview.game-agents.com
- **Edge Functions:** API proxies for OpenSky, CelesTrak, USGS (CORS handling)
- **Build:** `npm run build` → static `dist/` directory
- **Dev:** `npm run dev` → localhost:5173 with Vite HMR + API proxies

---

## 9. Roadmap

### Phase 3 — Planned
- [ ] **AIS live feed integration** — Real-time vessel tracking (currently static + military MMSI)
- [ ] **Weather overlay** — NOAA radar, wind patterns, satellite imagery
- [ ] **News feed integration** — Auto-geocode breaking news to globe positions
- [ ] **Multi-scenario support** — Load different conflict scenarios beyond Epic Fury
- [ ] **Recording/export** — Screen recording with timeline playback for content creation
- [ ] **Collaborative mode** — Multiple users viewing same globe with shared cursor/annotations
- [ ] **Mobile responsive** — Touch-optimized controls for tablet use
- [ ] **3D unit models** — Replace billboard icons with 3D aircraft/vessel models
- [ ] **Fog of war** — Intelligence uncertainty visualization (known vs. estimated positions)
- [ ] **Custom scenario editor** — Upload GeoJSON events, define timelines, create scenarios

### Phase 4 — Future
- [ ] **AI analysis layer** — Natural language queries ("show me all military flights near Iran")
- [ ] **Predictive modeling** — Ship route prediction, flight path extrapolation
- [ ] **Integration with nAIVE engine** — Game engine scenario handoff
- [ ] **VR/AR mode** — WebXR for immersive globe exploration
- [ ] **API/SDK** — Embeddable WorldView widget for third-party sites

---

## 10. Build History

| Date | Phase | What | Method |
|---|---|---|---|
| Feb 25 | Phase 1 | Core globe, flights, satellites, filters, earthquakes, CCTV, traffic, UI | 1 AI agent, ~90 min |
| Feb 25 | Phase 2 | Google 3D Tiles, military detection, traffic particles, shader sliders | 3 parallel AI agents, ~30 min |
| Feb 25 | — | ViewScout viewshed module added | 1 AI agent |
| Feb 26 | — | Timeline/replay system, strike overlays, GPS interference, airspace zones, shipping lanes | 1 AI agent |
| Feb 27 | — | Panoptix-style visual overhaul (event cards, hex bins, HUD, footprints) | 1 AI agent |
| Feb 28–Mar 1 | — | Aircraft icon refinement, global flight coverage, zoom controls | Iterative fixes |
| Mar 2 | — | Maritime tracking, military vessel detection | 1 AI agent |
| Mar 3 | — | Intelligence + cyber event types, pre-war intel timeline, Khamenei strike enrichment | Manual edit |

**Total:** ~9,900 lines of TypeScript, 50+ modules, built in <1 week.

---

## 11. License

MIT

---

*Built with OpenClaw — an army of AI agents orchestrated from a single terminal.*
