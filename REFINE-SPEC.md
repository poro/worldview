# WorldView Refinement — Based on Panoptix UI Teardown

**Project:** `/home/p0r0/clawd/projects/worldview/`
**Reference:** `reference/openai-ui-teardown.pdf` — professional UI analysis of 10 frames

The first build pass is done. This refinement addresses specific insights from the professional analysis plus gaps identified against the reference screenshots.

## READ THESE FILES FIRST
- `src/main.ts` — understand the full boot sequence and wiring
- `src/style.css` — all current CSS
- `src/data/events.ts` — conflict events data
- `src/layers/event-cards.ts` — current event card implementation
- `src/ui/filter-bar.ts` — current filter bar
- `src/ui/hud.ts` — current HUD
- `src/osint/strikes.ts` — current strike layer
- `src/osint/gps-interference.ts` — current GPS layer
- `src/flights/tracker.ts` — flight tracker with SVG icons
- `src/satellites/renderer.ts` — satellite renderer
- `index.html` — check for CRT/vignette overlay divs

---

## R1. Event Cards → Screen-Stable HTML Overlays with Images

**Problem:** Current event cards use Cesium label entities. They're functional but don't match the reference's rich cards with thumbnails, type badges, and connector lines that stay readable during camera movement.

**Fix:** Replace entity labels with HTML overlay divs positioned via `Cesium.SceneTransforms.wgs84ToWindowCoordinates()`.

In `src/layers/event-cards.ts`, rewrite to:

```typescript
// Each card is an HTML div that follows its map position
interface CardState {
  event: ConflictEvent;
  div: HTMLElement;
  groundEntity: Cesium.Entity;
  connectorEntity: Cesium.Entity;
}

// On each render frame (viewer.scene.preRender), update positions:
viewer.scene.preRender.addEventListener(() => {
  for (const card of cards) {
    const screenPos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      viewer.scene, 
      Cesium.Cartesian3.fromDegrees(card.event.lon, card.event.lat, 0)
    );
    if (screenPos) {
      card.div.style.left = `${screenPos.x}px`;
      card.div.style.top = `${screenPos.y - 120}px`; // offset above ground
      card.div.style.display = '';
    } else {
      card.div.style.display = 'none'; // off-screen
    }
  }
});
```

Card HTML structure:
```html
<div class="event-card">
  <div class="event-card-header">
    <span class="event-type-badge kinetic">KINETIC</span>
    <span class="event-time">07:38 UTC</span>
  </div>
  <div class="event-card-title">KERMANSHAH WAVE</div>
  <div class="event-card-desc">Second wave strikes on military installations</div>
  <!-- Optional thumbnail if imageUrl exists -->
  <img class="event-card-thumb" src="..." />
</div>
```

CSS for event cards:
```css
.event-card {
  position: fixed;
  pointer-events: none;
  z-index: 150;
  background: rgba(10, 10, 15, 0.92);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 4px;
  padding: 8px 12px;
  min-width: 200px;
  max-width: 280px;
  font-family: 'JetBrains Mono', monospace;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  transform: translateX(-50%);
}
.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.event-type-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 1px 6px;
  border-radius: 2px;
}
.event-type-badge.kinetic { background: rgba(255,61,61,0.2); color: #ff3d3d; }
.event-type-badge.maritime { background: rgba(0,229,255,0.2); color: #00e5ff; }
.event-type-badge.retaliation { background: rgba(255,179,0,0.2); color: #ffb300; }
.event-type-badge.civilian_impact { background: rgba(255,140,0,0.2); color: #ff8c00; }
.event-type-badge.infrastructure { background: rgba(255,102,0,0.2); color: #ff6600; }
.event-type-badge.escalation { background: rgba(255,0,255,0.2); color: #ff00ff; }
.event-time { font-size: 9px; color: #666; }
.event-card-title { font-size: 11px; color: #e0e0e0; font-weight: 600; margin-bottom: 2px; }
.event-card-desc { font-size: 9px; color: #888; line-height: 1.3; }
.event-card-thumb { width: 100%; height: 80px; object-fit: cover; border-radius: 2px; margin-top: 6px; border: 1px solid rgba(255,255,255,0.1); }
```

Keep the connector polyline entities from ground to the card position.

**Important:** Only show cards for events visible in the current viewport. Don't render all 14 cards at once — check if the ground position is on-screen.

## R2. Event Data Expansion — More Events + Correct Dates

The events in `src/data/events.ts` use 2025 dates. Operation Epic Fury started Feb 28, 2026. Update ALL dates to 2026-02-28 (Day 1), 2026-03-01 (Day 2), 2026-03-02 (Day 3).

Also add MORE events to flesh out the timeline. Search existing strike data in `src/data/strikes.ts` for coordinates and names to derive events from.

Add at least 20 total events covering:
- Day 1 (Feb 28): Initial strikes, airspace closures, DEFCON change
- Day 2 (Mar 1): Retaliation, maritime incidents, civilian impact
- Day 3 (Mar 2): Continued operations, F-15 crash, escalation

## R3. Hex Bin Aggregation for Strike Density

**From analysis:** "Large red bins appear to encode density or severity; they look generated, not hand-placed."

Create `src/layers/hex-bins.ts`:
- Generate hex bin grid over the Iran theater region
- Count events per hex cell
- Render as 3D extruded hexagons where height = event count, opacity = density
- Red gradient color scale (low density = pink transparent, high = solid red)
- This is SEPARATE from the individual strike markers
- Use a ~50km hex grid cell size
- Only generate bins where events exist (sparse grid)

## R4. Satellite Footprint Lines Enhancement

Check if `src/satellites/renderer.ts` got footprint lines added. If not or if minimal, enhance:
- For satellites in the 'military' and 'weather' categories, draw cyan lines from sat position to a ground footprint area
- Lines should fan out (not just one straight line) — draw 3-5 lines from satellite to ground corners of the imaging swath
- Use the actual satellite altitude from TLE propagation
- Label military sats with their names above the globe

## R5. HUD Enhancement — Classification Banner + Metrics

In `src/ui/hud.ts`, add/update:
- Top-left classification banner: "TOP SECRET // SI-TK // NOFORN" in a styled bar (scenario flavor text)
- Below it: "KH11-4063 OPS-4150" reference number (hardcoded)
- Status: "NORMAL" with green indicator dot
- Below status: location context "GLOBAL NEAR PALM JUMEIRAH (DUBAI) 1260KM | AF.."
- Bottom-left: MGRS coordinates that update as cursor moves. Use a simple lat/lon to MGRS conversion (can approximate: just format as military grid like "38P NU 6845 1002" and update the numbers from cursor position)
- Bottom-right: GSD (ground sample distance), altitude, sun elevation angle. GSD = approximate from camera height. Sun angle from Cesium sun position.
- Top-right: REC indicator (blinking red dot + "REC"), timestamp updating in real-time, satellite pass counters (ORB, PASS, DESC)
- Top-center: "LIVE / PLAYBACK" toggle buttons (use the TimeController mode)

Check what the existing HUD already has and ADD what's missing, don't replace what works.

## R6. Airspace Closure Label Improvement

In `src/osint/airspace.ts`, ensure EVERY closure zone has a large floating label:
- "IRAN AIRSPACE CLOSED"
- "IRAQ AIRSPACE CLOSED"  
- "TURKEY AIRSPACE CLOSED" (if in data)
- "BAHRAIN AIRSPACE CLOSED"
- "QATAR AIRSPACE CLOSED"
- "JORDAN AIRSPACE CLOSED"
- "KUWAIT AIRSPACE CLOSED"

Labels should be:
- Bold, 12-13px font
- Use `backgroundColor` with dark semi-transparent background
- Centered over each zone's polygon
- Visible at medium zoom levels

## R7. GPS Heatmap Texture

In `src/osint/gps-interference.ts`, the current implementation likely uses colored ellipses. Enhance with a canvas-generated heatmap texture:

1. Create an HTML canvas off-screen
2. Draw gaussian blobs for each jamming source
3. Use blue/purple gradient colors
4. Apply as an `ImageMaterialProperty` to a rectangle covering the jamming area
5. This creates the gradient density look from the reference

Alternative simpler approach: use multiple concentric ellipses with decreasing opacity to simulate gradient.

## R8. LIVE/PLAYBACK Toggle

Add a prominent toggle at top-center of the screen:
```html
<div class="live-playback-toggle">
  <button class="mode-btn active" id="mode-live">LIVE</button>
  <button class="mode-btn" id="mode-playback">PLAYBACK</button>
</div>
```

Wire to TimeController's `setMode()`. When PLAYBACK is active, show the timeline scrubber. When LIVE, hide timeline and show live data feeds.

## R9. Speed Control Buttons on Timeline

In `src/ui/timeline.ts` and `src/ui/timeline.css`, add speed preset buttons:
- `1x/s`, `3x/s`, `5x/s`, `15x/s`, `1h/s`
- Wire to TimeController `setSpeed()`
- Active speed button gets highlighted style

Also add red event marker pips on the timeline bar — one small red line for each conflict event.

## R10. CSS Polish

Add to `src/style.css`:

```css
/* Ensure CRT overlay div exists and is styled */
.crt-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 5;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.02) 0px,
    rgba(0, 0, 0, 0.02) 1px,
    transparent 1px,
    transparent 3px
  );
}

/* Vignette for that surveillance camera look */
.vignette-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 4;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
}
```

Make sure both divs exist in `index.html`. If they already do, just verify the CSS is applied.

---

## Build/Test
```bash
cd /home/p0r0/clawd/projects/worldview
npm run build
systemctl --user restart worldview
```

## CRITICAL RULES
- DO NOT break existing functionality
- Read files before modifying them
- No pulsing radius CallbackProperties (Cesium crash)
- Keep `.ts` extension in imports if that's the project convention (check existing files)
- The project does NOT use `.ts` in imports — use bare paths like `'./config'`
