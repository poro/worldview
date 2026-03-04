# WorldView — Technical Audit & Architecture Review
**Date:** March 4, 2026  
**Auditor:** Dufus  
**Codebase:** 66 TypeScript files, 13,058 LOC, 1,255 LOC CSS

---

## 1. What We Built

WorldView is a real-time 3D geospatial intelligence platform built on CesiumJS. It renders a photorealistic globe with multiple live data overlays, scenario replay, and an information warfare analysis layer ("The Feed").

### Core Systems (16 modules instantiated in main.ts)

| System | Files | LOC | Data Source | Status |
|--------|-------|-----|-------------|--------|
| **Flight Tracker** | tracker.ts, api.ts, types.ts, military.ts | 986 | adsb.fi via CF Worker proxy | ⚠️ Rate-limited, staggered batches |
| **Satellite Renderer** | renderer.ts, propagator.ts, tle.ts | 485 | TLE propagation (satellite.js) | ✅ Working |
| **Maritime Tracker** | tracker.ts, api.ts, military.ts, types.ts | 670 | Unknown API | ❓ Unverified |
| **The Feed** | manager.ts, claims.ts, sources.ts, gdelt.ts, supabase.ts, propagation.ts, types.ts, config.ts, scenario-epic-fury.ts | 3,123 | CMNN scraper, GDELT, NewsAPI | ✅ Just built |
| **Event Cards** | event-cards.ts, events.ts, events-info.ts | 433 | Static scenario data | ✅ Working |
| **Earthquake Layer** | earthquakes.ts | 142 | USGS GeoJSON | ✅ Working |
| **GPS Interference** | gps-interference.ts, data | 271 | Static data | ✅ Working |
| **Airspace Zones** | airspace.ts, data | 283 | Static data (NOTAMs) | ✅ Working |
| **Strike Layer** | strikes.ts, data | 403 | Static scenario data | ✅ Working |
| **Shipping Routes** | shipping.ts, data | 313 | Static data | ✅ Working |
| **CCTV Feeds** | feeds.ts | 276 | External streams | ❓ Unverified |
| **Traffic Particles** | particles.ts | 341 | OpenStreetMap Overpass API | ⚠️ Heavy API usage |
| **Internet Blackout** | internet-blackout.ts | 81 | Static data | ✅ Working |
| **Country Borders** | countries.ts | 71 | Cesium built-in | ✅ Working |
| **Hex Bins** | hex-bins.ts | 121 | Aggregation of other layers | ✅ Working |
| **ViewScout** | panel.ts, compute.ts, elevation.ts, water.ts, overlay.ts, score.ts, index.ts | 1,090 | Elevation API + viewshed calc | ✅ Working |

### UI Systems (8 UI modules)

| UI Component | LOC | Purpose |
|--------------|-----|---------|
| **HUD** | 502 | Top-left status overlay (time, coords, data age) |
| **Controls** | 304 | Left sidebar layer toggles |
| **Timeline** | 549 | Bottom timeline bar (LIVE/PLAYBACK modes) |
| **Detail Panel** | 204 | Right-side entity detail view |
| **Effects Panel** | 207 | Visual filter controls (NVG, FLIR, CRT) |
| **Feed Panel** | 202 | Right-side Feed article list |
| **Filter Bar** | 98 | Bottom pill buttons for layer toggles |
| **Zoom Controls** | 168 | Zoom in/out/presets |

### Supporting Systems

| System | LOC | Purpose |
|--------|-----|---------|
| **Filter Manager + Shaders** | 352 | Post-processing (night vision, FLIR, CRT, enhanced) |
| **Time Controller** | 181 | Playback/live mode time management |
| **Data Adapter** | 376 | Timeline event data sourcing |
| **View Modes** | 64 | Normal/Intel/Tactical view switching |
| **Right Panel** | 88 | Container for detail + feed panels |

### External Dependencies

| Dependency | Purpose | Bundle Impact |
|------------|---------|---------------|
| **CesiumJS 1.124** | 3D globe rendering | 22MB assets (loaded separately) |
| **satellite.js** | TLE orbit propagation | ~15KB |
| **@supabase/supabase-js** | Database client | ~50KB |

### External APIs (runtime)

| API | Calls/cycle | Auth | Reliability |
|-----|------------|------|-------------|
| adsb.fi (via CF Worker) | 26 regions/15s | None | ⚠️ 429 rate limits |
| USGS Earthquake | 1/session | None | ✅ Solid |
| OSM Overpass | On viewport | None | ⚠️ Can be slow |
| Supabase (CMNN scraper) | 1/5min | API key | ✅ Solid |
| Supabase (WorldView) | On demand | API key | ✅ Solid |
| GDELT | 1/5min | None | ❌ Frequently unresponsive |
| NewsAPI | 1/5min | API key (optional) | ✅ When configured |

### Keyboard Bindings

~40 keyboard shortcuts bound. Almost every letter A-Z is used. This is an accessibility and discoverability nightmare.

---

## 2. What Works

### ✅ Strengths

1. **Globe rendering is stunning.** Google 3D Tiles + Cesium makes this look like a movie prop. The visual impression is immediate.

2. **Modular architecture.** Each data layer is self-contained (own class, own data source, own toggle). Adding/removing layers doesn't break others.

3. **Real data integration.** Live flights, real earthquake data, actual satellite positions from TLE propagation. Not just a pretty visualization — actual OSINT.

4. **The Feed concept is compelling.** Information warfare as a geospatial layer is novel. Claims, propagation rings, narrative tracking, bot networks — the type system is well-thought-out.

5. **Filter effects are creative.** Night vision, FLIR, CRT modes via WebGL shaders give it that mil-spec aesthetic.

6. **ViewScout is unique.** Terrain viewshed analysis in a browser is genuinely useful for real-world applications.

7. **Build is clean.** TypeScript strict, no `any` leaks (except flight API cache), 1.1s build time. Good developer experience.

---

## 3. What Doesn't Work

### ❌ Critical Issues

#### 3a. Rate Limiting is Existential
The flight tracker fires 26 API calls every 15 seconds through a single Cloudflare Worker. This will always hit rate limits. The stagger/cache/retry we added tonight is a band-aid. **The proxy architecture is fundamentally wrong for this volume.**

**Fix:** Server-side aggregation. A single process fetches all regions on a timer, caches in Redis/memory, serves clients from cache. OR switch to a paid ADS-B data provider (ADSBExchange, FlightRadar24 API).

#### 3b. The Feed Type System is Over-Engineered
The `Claim` interface has **25 fields**, including nested objects like `PropagationProfile`, `ReachMetrics`, `ClaimSource`, `ClaimAmplifier[]`, `EvidenceLink[]`. For live news from scraped topics, we populate maybe 8 of these and fill the rest with dummy values (`truthScore: 50`, `propagationRadius: 200`, empty arrays).

The type system was designed for a full information warfare simulation game — not for displaying news on a globe. The GDELT and scraper sources produce titles + URLs. The mismatch between the data model and actual data is severe.

**Fix:** Split into two interfaces: `LiveArticle` (simple: headline, source, location, timestamp, url, severity) and `ScenarioClaim` (full type for Epic Fury simulation). Use a union type in the renderer.

#### 3c. 19 setInterval Timers Running Simultaneously
The app has 19 concurrent interval timers: flight updates (15s), satellite position updates, maritime updates, traffic particles, timeline refresh, feed updates, time controller ticks, data age updates, live feed refresh, and more. On a lower-end machine, this creates constant CPU churn even when the user isn't interacting.

**Fix:** Use `requestAnimationFrame` for visual updates. Use visibility-based polling — pause intervals when the tab is hidden. Consolidate into a single tick loop.

#### 3d. DOM Pollution
84 `createElement` calls, most building UI imperatively. No framework, no virtual DOM, no reactive state. Every panel is hand-rolled HTML strings concatenated with template literals. This makes the UI brittle and hard to modify.

**Fix:** Not necessarily "use React" — but at minimum, use a lightweight reactive library (Preact, Solid, or even lit-html) for the UI panels. Keep Cesium in vanilla JS but let a framework handle the 8+ UI panels.

#### 3e. main.ts is a God File
651 lines, instantiates 16+ systems, handles all keyboard events, manages boot sequence, and wires callbacks between systems. This is the classic "everything talks to everything through main" anti-pattern.

**Fix:** Event bus or message system. Systems subscribe to events instead of main.ts manually wiring `onToggle` → `controls.setLayerState` for every layer.

---

## 4. UX/UI Assessment

### The Complexity Problem

WorldView has **10 toggleable data layers**, **5 visual filters**, **3 view modes**, **2 feed modes** (live/scenario), **8 location presets**, **~40 keyboard shortcuts**, a **timeline**, a **viewshed tool**, and a **detail panel**. That's roughly 30+ interactive elements competing for the user's attention on a single screen.

**This is a power-user tool pretending to be a web app.** The information density is appropriate for a military C2 system or a Bloomberg terminal — but not for a browser demo at GDC.

### Specific UX Issues

1. **No onboarding.** User lands on a globe with dozens of dots and panels. No tutorial, no progressive disclosure, no "start here."

2. **Keyboard-dependent.** Most functionality requires knowing keyboard shortcuts. No tooltips, no command palette, no help overlay (H key exists but discoverability is zero).

3. **Panel overlap.** Left sidebar (controls), right sidebar (detail/feed), bottom (timeline + filter bar), top (HUD), bottom-left (global ticker), plus floating event cards and zoom controls. Screen real estate is exhausted.

4. **No mobile story.** CesiumJS works on mobile but the UI assumes a large desktop viewport. Controls, panels, and keyboard shortcuts don't translate.

5. **Visual noise.** When all layers are on: flights (thousands of dots), satellites, ships, GPS interference zones, airspace polygons, event cards, traffic particles, strikes, hex bins, blackout zones — it's overwhelming. The filter bar helps but the default state is too busy.

6. **Feed panel is disconnected from the globe.** When LIVE mode shows 50 articles in a scrollable list, there's weak spatial connection between the list items and their globe positions. Clicking should fly to location + highlight, and vice versa.

---

## 5. Simplification Recommendations

### Tier 1: Immediate (No Architecture Change)

1. **Default to fewer layers ON.** Boot with only Flights + Event Cards active. Everything else off until toggled.

2. **Add a simple help overlay.** Press `?` for a keyboard shortcut cheat sheet.

3. **Reduce keyboard bindings.** Keep only: F (flights), S (sats), N (news), G (ground truth), M (maritime), P (Iran preset), 1-5 (filter modes), Escape. Remove single-letter bindings for obscure features.

4. **Progressive loading.** Don't fetch all data sources on boot. Fetch flights first (most visual impact), then satellites, then others as user toggles them.

### Tier 2: Medium-Term (Some Refactoring)

5. **Simplify the Claim type.** Create `LiveArticle` for news, keep `Claim` for scenario mode. Stop filling 25 fields with dummy data.

6. **Consolidate timers.** Single `requestAnimationFrame` loop with delta-time based updates. Systems register update functions. Pause everything when tab is hidden.

7. **Extract main.ts wiring.** Create an `AppContext` or event bus. Systems publish/subscribe instead of direct callback wiring.

8. **Server-side flight aggregation.** Move the 26-region fetch to a Cloudflare Worker on a 15s cron, cache results, serve clients from cache. One API call per client instead of 26.

### Tier 3: If Building for Production

9. **UI framework for panels.** Preact or Solid for the 8 UI panels (~2,300 LOC of hand-rolled DOM). Keep Cesium vanilla.

10. **Replace GDELT.** It's unreliable and doesn't add value over the scraper pipeline. Remove it, rely on CMNN scraper + NewsAPI.

11. **Responsive design.** At minimum: hide sidebar on mobile, touch-friendly zoom, swipe for feed panel.

12. **WebSocket for live data.** Replace polling intervals with a server that pushes updates. Reduces client complexity and API calls.

---

## 6. Are We Using the Right Tools?

### CesiumJS — ✅ Right Choice (with caveats)

CesiumJS is the gold standard for 3D geospatial in the browser. Google Earth-level rendering, WGS84 precision, 3D Tiles support. Nothing else comes close for this use case.

**Caveats:**
- 22MB asset footprint (acceptable for a serious tool, bad for a quick demo)
- Entity API is convenient but doesn't scale past ~5,000 entities (we're fine for now)
- If entity count grows, migrate to Cesium Primitive API or deck.gl for high-volume layers

### Alternatives Considered

| Tool | Pros | Cons | Verdict |
|------|------|------|---------|
| **deck.gl + Mapbox** | Better for 2D/2.5D, huge dataset perf | No true 3D globe, Mapbox pricing | ❌ Wrong for this |
| **Three.js + custom globe** | Full control, smaller bundle | Massive effort to replicate Cesium features | ❌ Reinventing the wheel |
| **Google Maps JS API** | Easy, familiar | No 3D globe, no military aesthetic, limited customization | ❌ Wrong vibe |
| **Resium (React + Cesium)** | React integration | Adds React overhead, Resium is poorly maintained | ⚠️ Maybe for UI panels only |
| **Cesium + Preact for UI** | Lightweight UI framework, Cesium stays vanilla | Requires refactoring UI panels | ✅ Recommended |

### satellite.js — ✅ Right Choice
Only option for client-side TLE propagation. Lightweight, accurate.

### Supabase — ✅ Right Choice
Already in the stack, real-time subscriptions available, generous free tier. Good for both WorldView data and the scraper pipeline.

### Vite — ✅ Right Choice
1.1s build, good Cesium plugin, HMR works. No reason to change.

---

## 7. Production Readiness Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Impact | 9/10 | Stunning. The globe + 3D tiles + military aesthetic is impressive |
| Code Quality | 6/10 | TypeScript strict ✅, but god-file main.ts, no tests, no error boundaries |
| Data Reliability | 4/10 | Flights rate-limited, GDELT broken, maritime unverified, most data static |
| UX/Discoverability | 3/10 | Power-user only, no onboarding, keyboard-dependent |
| Performance | 5/10 | 19 timers, 26 parallel API calls, no lazy loading |
| Mobile | 1/10 | Keyboard-dependent, panels don't collapse |
| Scalability | 5/10 | Entity API works now, but won't past 10K entities |
| Demo-Ready (GDC) | 7/10 | Impressive on a big screen with someone driving it |

---

## 8. Recommendation

**WorldView is a spectacular demo with a complexity debt.** The visual impact is genuine — this looks like something a defense contractor would build. But the UX assumes the user already knows how to use it, and the architecture assumes infinite API bandwidth.

**For GDC (6 days away):** Don't refactor. Polish what exists. Fix the flight rate limiting (server-side cache), default to fewer layers, add a `?` help overlay. Demo it yourself — don't hand the keyboard to someone else.

**Post-GDC:** Simplify the Feed type system, consolidate timers, extract main.ts, add Preact for UI panels, move flight aggregation server-side, kill GDELT.

**Long-term:** This could be a real product — either as an OSINT tool or as an educational platform for information warfare analysis. The Feed concept (claims + propagation + narrative tracking on a globe) is genuinely novel. But it needs to be 10x simpler to use before anyone other than you can appreciate it.
