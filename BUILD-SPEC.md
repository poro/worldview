# WorldView Visual Overhaul — Build Spec

**Goal:** Match the Panoptix WORLDVIEW application quality. Reference images at `reference/*.jpg`.

**Project:** `/home/p0r0/clawd/projects/worldview/` — Vite + CesiumJS + TypeScript
**DO NOT break existing functionality.** Enhance and add.

## Architecture Notes
- All config constants go in `src/config.ts`
- New layers get their own file in `src/osint/` or `src/layers/`
- UI components in `src/ui/`
- Data files in `src/data/`
- Static assets in `public/data/`
- Country GeoJSON already downloaded: `public/data/countries.geojson` (3MB) and `public/data/borders.geojson` (333KB)
- The existing `src/flights/tracker.ts` already has airplane SVG icons, military classification, altitude coloring. It needs VISUAL UPGRADE not rewrite.
- The existing `src/satellites/renderer.ts` renders satellites with orbit paths. It needs footprint lines added.
- Recorder API at `http://localhost:3020` has flight snapshots.

## PHASE 1: Airplane Icons & Flight Visuals (HIGHEST IMPACT)

### 1a. Better Airplane Icons
Current: small white SVG airplane outline. 
Target: Solid airplane silhouettes, larger, color-coded by type:
- **Light blue** = commercial (current altitude coloring can stay as option)
- **Yellow** = military  
- **Orange/red** = flagged/special squawk

In `src/flights/tracker.ts`:
- Make airplane SVGs **larger** (32px → 48px for military, 40px commercial)
- Ensure airplane icon **rotates to heading** (should already work via billboard.rotation)
- Make the icon a **filled solid** airplane shape, not just outline stroke
- Add **drop shadow/glow** for military aircraft

Create better SVGs:
```
// Commercial: solid light blue airplane
const COMMERCIAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
  <path d="M12 2L8 10H2L4 13H8L10 22H14L12 13H20L22 10H16L12 2Z" fill="#4dabf7" stroke="#2b7ab5" stroke-width="0.5"/>
</svg>`;

// Military: solid yellow/orange  
const MILITARY_SVG = `<svg ...same path... fill="#ffb300" stroke="#cc8800" .../>`;
```

### 1b. Always-Visible Callsign Labels
Current: labels may be hidden or too small.
Target: Every aircraft shows callsign label like Panoptix.
- Commercial: small gray/white labels
- Military: slightly larger, colored labels
- Labels should scale with zoom but always be readable
- Use `distanceDisplayCondition` to show more labels when zoomed in

### 1c. Flight Trail Lines
Ensure trail/wake lines are visible behind aircraft showing recent path.
White/blue semi-transparent polylines.

## PHASE 2: 3D Hexagonal Strike Markers

Replace flat ellipses with extruded 3D hexagons using Cesium's `PolygonGraphics` with `extrudedHeight`.

In `src/osint/strikes.ts`:
```typescript
// Generate hexagon vertices around a center point
function hexagonPositions(lon: number, lat: number, radiusKm: number): Cesium.Cartesian3[] {
  const positions = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const dLat = (radiusKm / 111.32) * Math.cos(angle);
    const dLon = (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
    positions.push(Cesium.Cartesian3.fromDegrees(lon + dLon, lat + dLat));
  }
  return positions;
}

// Then use:
entity.polygon = {
  hierarchy: new Cesium.PolygonHierarchy(hexagonPositions(strike.lon, strike.lat, 15)),
  material: Cesium.Color.RED.withAlpha(0.7),
  extrudedHeight: 50000, // 50km tall
  height: 0,
  outline: true,
  outlineColor: Cesium.Color.RED.withAlpha(0.9),
};
```

Different sizes based on strike type/magnitude. Keep the pulsing outline color (safe).

## PHASE 3: Country Borders & Labels

Create `src/layers/countries.ts`:

```typescript
export class CountryLayer {
  constructor(viewer: Cesium.Viewer) { ... }
  
  async load() {
    // Load borders GeoJSON
    const dataSource = await Cesium.GeoJsonDataSource.load('/data/borders.geojson', {
      stroke: Cesium.Color.fromCssColorString('#ff6688').withAlpha(0.5),
      strokeWidth: 1.5,
      fill: Cesium.Color.TRANSPARENT,
    });
    viewer.dataSources.add(dataSource);
    
    // Add country labels for key countries
    const labels = [
      { name: 'IRAN', lon: 53, lat: 32 },
      { name: 'IRAQ', lon: 44, lat: 33 },
      { name: 'KUWAIT', lon: 47.5, lat: 29.3 },
      { name: 'BAHRAIN', lon: 50.5, lat: 26 },
      { name: 'QATAR', lon: 51.2, lat: 25.3 },
      { name: 'UNITED ARAB EMIRATES', lon: 54, lat: 24 },
      { name: 'SAUDI ARABIA', lon: 45, lat: 24 },
      { name: 'OMAN', lon: 57, lat: 21 },
      { name: 'TURKEY', lon: 35, lat: 39 },
      { name: 'SYRIA', lon: 38, lat: 35 },
      { name: 'JORDAN', lon: 36, lat: 31 },
      { name: 'ISRAEL', lon: 35, lat: 31.5 },
      { name: 'LEBANON', lon: 35.8, lat: 33.8 },
      { name: 'AFGHANISTAN', lon: 67, lat: 33 },
      { name: 'PAKISTAN', lon: 69, lat: 30 },
    ];
    
    for (const c of labels) {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat),
        label: {
          text: c.name,
          font: '11px JetBrains Mono',
          fillColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.4),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.5e7),
        },
      });
    }
  }
  
  toggle() { ... }
}
```

## PHASE 4: Airspace Closure Polygons with Labels

Upgrade `src/osint/airspace.ts` — currently renders but needs:
- Per-country shaded polygons (pink/red semi-transparent)
- Large floating labels: "IRAN AIRSPACE CLOSED", "BAHRAIN AIRSPACE CLOSED" etc.
- Check `src/data/airspace.ts` for existing boundary polygon data

## PHASE 5: Bottom Filter Bar

Create `src/ui/filter-bar.ts` — a fixed bottom bar with color-coded toggleable pills.

Row 1: Commercial Flights, Military Flights, GPS Jamming, Ground Truth Cards, Imaging Satellites, Maritime Traffic, Airspace Closures, VHF Intercept, Internet Blackout, Country Borders, OSINT Social Events

Row 2: Kinetic, Retaliation, Civilian Impact, War, Infrastructure, Escalation

Each pill has:
- Colored dot/icon
- Text label  
- Click to toggle
- Active/inactive visual state
- Calls toggle() on the corresponding layer

CSS: fixed bottom, dark background, horizontal scrollable on mobile.

## PHASE 6: Internet Blackout Overlay

Create `src/layers/internet-blackout.ts`:
- Polygon over Iran with semi-transparent dark overlay
- Large red text label "TEHRAN INTERNET BLACKOUT" rendered on the terrain
- Togglable via filter bar

Data: hardcoded polygon covering Iran's major cities.

## PHASE 7: Ground Truth / KINETIC Event Cards

Create `src/layers/event-cards.ts`:

Event cards are floating HTML elements positioned over the globe:
- Dark background card with border
- "KINETIC" type label + timestamp
- Title text (e.g., "KERMANSHAH WAVE", "BUSHEHR STRIKE REPORTS")
- Optional image thumbnail
- Thin white connector line from card to ground location

Use Cesium's `viewer.entities.add()` with `label` for text, or HTML overlay divs positioned via `Cesium.SceneTransforms.wgs84ToWindowCoordinates()`.

Data source — create `src/data/events.ts`:
```typescript
export interface ConflictEvent {
  id: string;
  type: 'kinetic' | 'retaliation' | 'civilian_impact' | 'infrastructure' | 'escalation' | 'maritime';
  title: string;
  description: string;
  time: string; // ISO
  lat: number;
  lon: number;
  imageUrl?: string; // optional satellite/ground imagery
}

export const CONFLICT_EVENTS: ConflictEvent[] = [
  { id: 'K-001', type: 'kinetic', title: 'ZERO HOUR: ISFAHAN', time: '2025-06-14T07:05:00Z', lat: 32.65, lon: 51.68, description: 'Initial strikes on Isfahan Nuclear Technology Center' },
  { id: 'K-002', type: 'kinetic', title: 'KERMANSHAH WAVE', time: '2025-06-14T07:38:00Z', lat: 34.32, lon: 47.06, description: 'Second wave strikes on Kermanshah military installations' },
  { id: 'K-003', type: 'kinetic', title: 'BUSHEHR STRIKE REPORTS', time: '2025-06-14T07:42:00Z', lat: 28.98, lon: 50.82, description: 'Reports of strikes near Bushehr nuclear power plant' },
  { id: 'K-004', type: 'kinetic', title: 'QOM IMPACT REPORTS', time: '2025-06-14T07:33:00Z', lat: 34.64, lon: 50.88, description: 'Impact reports from Fordow facility near Qom' },
  { id: 'K-005', type: 'kinetic', title: 'TEHRAN STRIKE', time: '2025-06-14T07:22:00Z', lat: 35.70, lon: 51.40, description: 'Strikes on Parchin military complex near Tehran' },
  { id: 'K-006', type: 'kinetic', title: 'KHAUBAN COMPOUND', time: '2025-06-14T07:22:00Z', lat: 35.65, lon: 51.35, description: 'Strikes on IRGC compound in Tehran suburbs' },
  { id: 'M-001', type: 'maritime', title: 'HORMUZ BROADCAST', time: '2025-06-14T10:00:00Z', lat: 26.5, lon: 56.3, description: 'Maritime broadcast warning — Strait of Hormuz closure threat' },
  // ... add more events covering the full operation timeline
];
```

## PHASE 8: Satellite Footprint Lines

In `src/satellites/renderer.ts`, add footprint visualization:
- For imaging satellites (WORLDVIEW-2, etc.), draw lines from satellite position down to Earth showing imaging swath
- Use `viewer.entities.add()` with polyline from satellite altitude to ground
- Cyan/white semi-transparent lines
- Only for selected satellite categories (imaging, ISR)

## PHASE 9: Night Vision / View Modes

Create `src/ui/view-modes.ts`:

Three modes selectable from a dropdown or keyboard shortcut:
1. **Normal** — current dark theme
2. **Tactical** — higher contrast, military blue tint
3. **Night Vision** — green phosphor CRT look

Night Vision implementation:
- Apply CSS filter to the Cesium canvas: `filter: saturate(0) brightness(0.8) sepia(1) hue-rotate(70deg) saturate(3)`
- Override all entity colors to shades of green
- Add CRT scan line overlay

## PHASE 10: CRT Scan Line Overlay

CSS overlay on top of the viewer:
```css
.crt-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 5;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: multiply;
}
```

Add a subtle vignette:
```css
.vignette-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 4;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
}
```

## PHASE 11: Right Side Panel

Create `src/ui/right-panel.ts`:
- SHARPER toggle (post-processing sharpness)
- HUD toggle (show/hide all HUD elements)
- View mode dropdown (Normal / Tactical / Night Vision)
- PANOPTIL toggle with opacity slider
- Layer checkboxes: Flights, Satellites, Facilities
- "CLEAN UI" button to hide all overlays

## PHASE 12: Enhanced HUD

Upgrade `src/ui/hud.ts`:
- Top-left: "WORLDVIEW" branding, classification banner "TOP SECRET // SI-TK // NOFORN" (it's a fictional scenario, this is flavor text)
- MGRS coordinate display (convert cursor lat/lon to MGRS)
- Bottom-right: GSD, altitude, sun angle readouts  
- Top-right: REC indicator (blinking red dot), timestamp, ORB/PASS/DESC counts for satellites
- LIVE / PLAYBACK toggle button at top center

## PHASE 13: GPS Jamming Heatmap Upgrade

Replace flat ellipses with gradient heatmap:
- Use Cesium's `RectanglePrimitive` or custom imagery layer
- Create a canvas-based heatmap texture
- Blue/purple gradient with intensity based on proximity to jamming source
- Much more visual impact than flat circles

## PHASE 14: Timeline Upgrade

The timeline exists at `src/ui/timeline.ts` and `src/ui/timeline.css`. Upgrade:
- Add red event markers on the scrubber bar (one pip per conflict event)
- Speed controls: 1x/s, 3x/s, 5x/s, 15x/s, 1h/s buttons
- Tooltip on event markers showing event title/time
- Wire to TimeController (already exists)

## PHASE 15: Aircraft Detail Popup

When clicking/hovering an aircraft, show a tooltip card:
- Tail number / registration
- Aircraft type (B742, A320, etc.)
- Callsign
- Operator (or "unknown")
- Altitude in feet
- Speed
- Dark background card style

---

## Build Order (do it in this sequence)

1. CRT overlay + vignette (pure CSS, 5 min, instant visual upgrade)
2. Country borders + labels (load GeoJSON, 15 min)
3. Airplane icon upgrade (enlarge, fill, color-code, 30 min)
4. 3D hex strike markers (replace ellipses, 30 min)
5. Bottom filter bar UI (major UI piece, 45 min)
6. Airspace closure labels (upgrade existing, 20 min)
7. Internet blackout layer (new, 20 min)
8. Event cards system (new, 45 min)
9. Satellite footprint lines (add to existing renderer, 30 min)
10. Night vision mode (CSS filter + dropdown, 30 min)
11. Right panel (new UI, 30 min)
12. Enhanced HUD (upgrade existing, 30 min)
13. GPS heatmap (canvas texture, 45 min)
14. Timeline upgrade (wire + event markers, 30 min)
15. Aircraft detail popup (hover card, 20 min)

## Testing
After ALL changes:
```bash
cd /home/p0r0/clawd/projects/worldview
npm run build  # must compile clean
systemctl --user restart worldview
```

The dev server runs on port 3019, proxied via Cloudflare tunnel to worldview.game-agents.com.

## Final Note
This is a CesiumJS TypeScript project. Import Cesium types properly. Use `as unknown as Cesium.Property` for CallbackProperty casts. NEVER use pulsing radius/semiMajorAxis CallbackProperty — only outline COLOR pulsing is safe (prevents Cesium geometry rebuild crashes).

When completely finished, run: openclaw system event --text "Done: WorldView visual overhaul complete — all 15 phases implemented" --mode now
