# WorldView — 3D Geospatial Command Center

## Overview
A Palantir-style 3D geospatial intelligence dashboard built with CesiumJS. Interactive globe with live flight tracking, satellite orbits, visual filters, and OSINT data overlays.

## Tech Stack
- **Vite + TypeScript** — Build tool and language
- **CesiumJS** — 3D globe rendering engine (cesium package from npm)
- **satellite.js** — SGP4 satellite orbit propagation from TLE data
- **Tailwind CSS** — UI styling (dark command-center theme)

## Features to Build

### 1. 3D Globe (Core)
- CesiumJS Viewer with dark theme
- Bing Maps or OpenStreetMap imagery (CesiumJS includes Bing by default)
- Terrain from Cesium World Terrain
- Smooth camera controls (zoom, pan, rotate, fly-to)
- Atmosphere and lighting effects
- Disable default CesiumJS UI chrome — build custom minimal UI

### 2. Live Flight Tracking
- **Data source:** OpenSky Network REST API (free, no auth needed for basic)
  - `https://opensky-network.org/api/states/all` — all aircraft states
  - `https://opensky-network.org/api/states/all?lamin=X&lomin=X&lamax=X&lomax=X` — bounding box
- Poll every 10 seconds for current viewport
- Render aircraft as 3D models or oriented billboards on the globe
- Show: callsign, altitude, speed, heading, origin country
- Click aircraft for detail panel
- Color by altitude or speed
- Trail lines showing recent path
- Aircraft count indicator in HUD

### 3. Satellite Orbits
- **Data source:** CelesTrak TLE data (free)
  - `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle` — Space stations (ISS)
  - `https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle` — Starlink
  - `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle` — All active
  - `https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle` — Military
- Use satellite.js to propagate positions from TLEs in real-time
- Render as dots/icons with orbital path lines
- Categories: ISS (highlight), Starlink (swarm), Military, Weather, GPS
- Toggle categories on/off
- Click for detail: name, altitude, speed, inclination, NORAD ID
- Show ground track projection

### 4. Visual Filters (WebGL Post-Processing)
- **Normal** — Standard satellite imagery
- **FLIR / Thermal** — Green-tinted thermal camera look (post-processing shader)
- **Night Vision** — Green phosphor with noise/grain and vignette
- **CRT** — Scanlines, chromatic aberration, slight curvature, flicker
- **Satellite (enhanced)** — High contrast, edge detection overlay
- Toggle via keyboard shortcuts (1-5) or UI buttons
- Filters are full-screen post-processing effects on the CesiumJS canvas

### 5. Command Center UI
- **Dark theme** — Black/dark gray background, green/cyan accent colors
- **HUD overlay** — Current time (UTC + local), coordinates under cursor, altitude
- **Side panel** — Collapsible, shows details for selected entity
- **Layer controls** — Toggle flights, satellites, weather, etc.
- **Search bar** — Fly to any location (use Cesium geocoder or simple lat/lon)
- **Minimap** — Small 2D map in corner showing current viewport
- **Stats bar** — Aircraft tracked, satellites visible, data freshness
- **Fullscreen mode**

### 6. OSINT Panel (Stretch)
- Recent earthquakes from USGS API (`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson`)
- Active weather alerts or storms
- Maritime AIS data if available
- News feed sidebar

### 7. Keyboard Shortcuts
- `1-5` — Switch visual filters
- `F` — Toggle flights layer
- `S` — Toggle satellites layer
- `H` — Toggle HUD
- `ESC` — Deselect / close panel
- `Space` — Pause/resume time
- `/` — Focus search bar

## File Structure
```
worldview/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── models/          # 3D aircraft model if using
│   └── textures/        # Custom textures
├── src/
│   ├── main.ts          # Entry point, init Cesium viewer
│   ├── style.css        # Tailwind + custom styles
│   ├── globe/
│   │   ├── viewer.ts    # CesiumJS viewer setup
│   │   └── camera.ts    # Camera utilities
│   ├── flights/
│   │   ├── api.ts       # OpenSky Network API client
│   │   ├── tracker.ts   # Flight entity management
│   │   └── types.ts     # Flight data types
│   ├── satellites/
│   │   ├── tle.ts       # TLE fetcher and parser
│   │   ├── propagator.ts # satellite.js orbit propagation
│   │   └── renderer.ts  # Satellite entity rendering
│   ├── filters/
│   │   ├── shaders.ts   # GLSL shader code
│   │   └── manager.ts   # Post-processing filter management
│   ├── ui/
│   │   ├── hud.ts       # Heads-up display overlay
│   │   ├── panel.ts     # Side detail panel
│   │   ├── controls.ts  # Layer toggles, filter buttons
│   │   └── search.ts    # Location search
│   ├── osint/
│   │   ├── earthquakes.ts
│   │   └── weather.ts
│   └── utils/
│       ├── time.ts
│       └── format.ts
```

## Cesium Ion Token
- Get a free token at https://ion.cesium.com (needed for terrain + base imagery)
- For now, use `Ion.defaultAccessToken` placeholder — Mark can create one

## Design References
- Palantir Gotham aesthetic
- Military C2 (command and control) systems
- Bloomberg Terminal dark theme
- The movie "War Games" / "Eye in the Sky" command center feel

## Deployment
- Build with Vite → static files
- Deploy to Vercel or serve from any static host
- Could run on gameagent.dev subdomain (e.g., worldview.gameagent.dev)

## Priority Order
1. Globe + dark UI + camera controls
2. Flight tracking (most visually impressive)
3. Visual filters (the wow factor)
4. Satellite orbits
5. OSINT overlays
6. Polish + keyboard shortcuts
