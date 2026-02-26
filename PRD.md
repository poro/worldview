Product Requirements Document: ViewScout
1. Executive Summary
Product Name: ViewScout
Product Type: Web application (React SPA with Node.js backend)
Target Market: Property buyers seeking homes with specific views (ocean, mountain,
city skyline), real estate agents marketing view properties, property investors evaluating
view premiums
Value Proposition: The first real estate search tool that lets you see what you can
actually see from any property — combining elevation/terrain data with property listings
so users can filter homes by verified view quality, not just listing photos
Key Differentiators: No existing real estate platform offers viewshed analysis integrated
with property listings. Users currently must manually cross-reference Zillow/Redfin
listings with separate GIS tools like UpToWhere or Google Earth Pro. ViewScout
eliminates this entirely.

2. Problem Statement
Current State
Real estate platforms (Zillow, Redfin, Realtor.com) show property photos, price, square
footage, and location on a flat map — but provide zero information about what a
property can actually see
Listing descriptions use vague terms like “ocean views” or “peek-a-boo water view” with
no verification or standardization
A property 5 miles inland on a hill may have better ocean views than one 1 mile from the
beach in a valley — but there is no way to discover this through existing search tools
Users must manually use GIS/viewshed tools (UpToWhere, HeyWhatsThat, Google Earth
Pro) and cross-reference with property listings — a time-consuming, technical process
that most buyers never do
View quality dramatically affects property value (20-100% premium for ocean views in

coastal California) but there is no standardized way to evaluate or compare views across
listings

Opportunity
US coastal real estate market is $3+ trillion in value
“Ocean view” and “mountain view” are among the top 10 search filters buyers wish
existed on Redfin/Zillow (per real estate forum analysis)
Open elevation data (USGS, Mapbox, OpenTopography) makes viewshed computation
feasible at scale
No competitor has built this — first-mover advantage is significant
Could expand beyond ocean views to mountain views, city skyline views, sunset/sunrise
orientation, and light analysis

3. Goals and Success Metrics
Primary Goals
User Goal: Enable property buyers to discover homes with verified views they wouldn’t
have found otherwise
Business Goal: Build a differentiated real estate discovery platform that captures leads
for real estate agents
Technical Goal: Compute viewshed analysis in near-real-time for any property
coordinate with sufficient accuracy for buying decisions

Success Metrics (KPIs)
User Metrics: 10K MAU within 6 months of launch; 40% return rate within 30 days
Engagement Metrics: Average 8+ properties analyzed per session; average session
duration 12+ minutes
Conversion Metrics: 5% click-through to listing source (Redfin/Zillow); 2% lead
generation for agent partnerships
Technical Metrics: Viewshed computation < 3 seconds; map render < 1 second; 99.5%
uptime

4. User Personas
Primary Persona: “The View Hunter”
Name/Type: Mark, 45, tech professional relocating to coastal California
Demographics: Household income $200K+, remote worker, relocating from non-coastal
area
Goals: Find a property with genuine ocean views, good weather, space, and reasonable
value. Willing to look at non-obvious locations (inland hills, lesser-known towns) if the
views are there
Pain Points: Can’t tell from Zillow photos what the actual daily view is; wasted time
visiting properties with misleading “ocean view” descriptions; doesn’t know which inland
hills have ocean sightlines
Technical Proficiency: High — comfortable with maps and tools but doesn’t want to
learn GIS software
Usage Context: Desktop primarily, researching in the evening, comparing 10-30
properties over several weeks

Secondary Persona: “The Listing Agent”
Name/Type: Sarah, 38, real estate agent specializing in coastal properties
Goals: Market view properties more effectively; discover undervalued properties with
views that aren’t being marketed; differentiate from other agents
Pain Points: No tool to prove/quantify view quality to buyers; losing listings to agents
who happen to know the terrain better
Usage Context: Mobile and desktop; needs shareable view reports for clients

Tertiary Persona: “The Investor”
Name/Type: James, 52, real estate investor analyzing view premiums
Goals: Identify underpriced properties where view quality isn’t reflected in the asking
price; build a portfolio of view properties
Pain Points: View premium analysis is entirely manual; no way to systematically scan for
“view arbitrage” opportunities

5. User Journeys and Scenarios
Core User Flow 1: Search by Location and Discover Views
1. User enters a city/region (e.g., "Oceanside, CA") or draws a bounding box on the map
2. Map displays property listings from data sources (dots on map)
3. User applies filters: price range, bedrooms, lot size
4. User toggles "View Filter" → selects "Ocean Visible"
5. Map re-renders showing ONLY properties with computed ocean visibility

6. Properties are color-coded by view quality score (green = panoramic, yellow = partial, ora
7. User clicks a property → sees:
a. Standard listing info (price, beds, baths, sqft, lot size)
b. 360° viewshed map showing what's visible from the property
c. Rendered horizon panorama showing the view in each direction
d. View quality score breakdown (% ocean visible, viewing angle, distance to water)
e. Elevation profile to the ocean
f. Link to original listing on Redfin/Zillow

Core User Flow 2: Explore Any Point (“What Can I See From Here?”)
1. User clicks anywhere on the map (not just a listed property)
2. A viewshed analysis runs for that point
3. Results overlay shows:
a. Visibility cloak — green = visible terrain, red = blocked
b. Whether ocean/water is visible and from what direction
c. Elevation of the point and surrounding terrain
d. Rendered panorama of the horizon
4. User can adjust observer height (ground level, 1 story, 2 story, 3 story)
5. Nearby property listings are shown with distance/price
6. User can save the point as a "favorite viewpoint" for later

Core User Flow 3: Compare Properties by View
1. User has saved 3-5 properties to their shortlist
2. Opens "Compare Views" panel
3. Side-by-side comparison showing:
a. View quality score for each
b. Panorama renders for each
c. Price per view-quality-point (value metric)
d. Elevation and tsunami risk for each
e. Distance to beach/water for each

Core User Flow 4: View Report Generation
1. User or agent selects a property
2. Clicks "Generate View Report"
3. System produces a shareable PDF/link containing:
a. Property details
b. Viewshed map
c. Panorama render
d. View quality score with methodology explanation
e. Elevation profile
f. Tsunami risk zone status
g. Sun path analysis (sunset/sunrise visibility)
4. Shareable via link, downloadable as PDF

6. Feature Requirements
Must Have (P0) — MVP
F1: Interactive Map Interface
Description: Full-screen interactive map with property listing overlay. Mapbox GL JS or
similar.
User Story: As a property buyer, I want to see listings on a map so I can understand
their geographic context.
Acceptance Criteria:
Map loads in < 1 second
Smooth pan/zoom with terrain layer visible
Property markers show price on hover
Map supports satellite, terrain, and hybrid views
Terrain elevation shading is visible by default
Bounding box or radius search supported
Dependencies: Mapbox GL JS, terrain tileset
F2: Viewshed Computation Engine

Description: Core engine that computes what terrain is visible from any given
lat/lng/altitude point using elevation data.
User Story: As a buyer, I want to click any point on the map and see what’s visible from
there so I can evaluate views without visiting.
Acceptance Criteria:
Computation completes in < 3 seconds for 20km radius
Uses SRTM 30m or better resolution elevation data
Observer height is adjustable (0m, 3m, 6m, 9m, 12m — representing ground, 1-story,
2-story, 3-story, 4-story)
Results rendered as color-coded overlay (green = visible, transparent = not visible)
Ocean/water bodies specifically identified in visibility results
Accuracy within 1° of azimuth for horizon calculation
Dependencies: Elevation data source (USGS SRTM, Mapbox Terrain, or
OpenTopography), compute backend
Technical Notes:
Viewshed algorithm: Use line-of-sight (LOS) ray casting from observer point across
DEM grid
Consider using Web Workers or server-side computation for performance
Cache viewshed results by grid cell to avoid recomputation
Elevation data tiles can be pre-downloaded and served from R2/S3
F3: Ocean/Water Visibility Detection
Description: Specifically detect whether ocean, lakes, or rivers are visible from a given
point, and quantify the view.
User Story: As a buyer searching for ocean-view properties, I want to filter listings by
whether the ocean is actually visible so I don’t waste time on properties without real
views.
Acceptance Criteria:
Water bodies identified from OpenStreetMap coastline/water data or Natural Earth
dataset

Binary detection: ocean visible yes/no from any point
Quantified: degrees of ocean visible (e.g., “42° panoramic ocean view from 220° to
262° bearing”)
Distance to nearest visible water point calculated
View classified as: Panoramic (>90°), Wide (45-90°), Partial (15-45°), Peek-a-boo
(<15°)
Dependencies: F2 (viewshed engine), coastline/water body geodata
F4: View Quality Score
Description: A composite score (0-100) that quantifies how good the view is from a
given property.
User Story: As a buyer comparing multiple properties, I want a standardized score so I
can quickly compare view quality.
Scoring Formula:
ViewScore = (
ocean_arc_degrees / 360 * 40 +

# 40% weight: width of ocean view

min(1, visible_area_km2 / 500) * 20 +

# 20% weight: total visible terrain area

elevation_percentile * 15 +

# 15% weight: relative elevation (higher = bet

(1 - obstruction_ratio) * 15 +

# 15% weight: lack of nearby obstructions

sunset_ocean_bonus * 10

# 10% weight: bonus if sunset is over ocean (w

)

Acceptance Criteria:
Score computed for every analyzed point
Score displayed prominently on property cards
Properties sortable by ViewScore
Score methodology accessible via info tooltip
Score color-coded: 80-100 green, 60-79 yellow, 40-59 orange, 0-39 gray
F5: Property Listing Data Integration
Description: Ingest property listing data to display on the map with standard real estate
information.

User Story: As a buyer, I want to see property details alongside view analysis so I can
make informed decisions.
Acceptance Criteria:
Properties displayed with: price, beds, baths, sqft, lot size, listing photos, address
Link to original listing on source platform
Data refreshed daily
Support for at least one data source at MVP
Data Source Options (choose one for MVP):
Redfin API / data feed (if available)
RapidAPI real estate APIs (Zillow bridge, Realtor bridge)
Attom Data API (comprehensive property data)
Manual CSV upload (fallback for MVP)
Dependencies: API key/agreement with data provider
MVP Fallback: If API licensing is complex, MVP can launch with “Explore Any Point”
mode (F2/F3) without integrated listings, with manual address entry. Users bring their
own listings and use ViewScout purely for view analysis.
F6: Search and Filter
Description: Standard real estate search with the addition of view-based filters.
User Story: As a buyer, I want to filter properties by price, size, AND view quality so I
find exactly what I’m looking for.
Acceptance Criteria:
Location search: city, zip, address, or draw-on-map
Standard filters: price range, beds, baths, sqft, lot size, property type
View filters (unique to ViewScout):
Ocean visible: Yes / No
View quality: Panoramic / Wide / Partial / Any
Minimum ViewScore: slider 0-100

View direction: N/S/E/W (useful for sunset chasers)
Filters persist in URL for shareability
Results update in real-time as filters change
F7: Elevation Profile
Description: Show a cross-section elevation profile from the property to the ocean (or
any target point).
User Story: As a buyer, I want to see the terrain profile between a property and the
ocean to understand if/why the view is blocked or clear.
Acceptance Criteria:
User clicks property, then clicks ocean (or any point) → profile rendered
Profile shows: terrain height, building obstruction zones, line-of-sight line
Interactive — hover to see elevation at any point along the profile
Clear visual indication of where LOS is blocked vs clear
Rendered as a chart below the map (Chart.js or D3)
Dependencies: F2 elevation data

Should Have (P1) — Post-MVP
F8: Rendered Panorama View
Description: Generate a visual panoramic rendering of what the view looks like from a
given point, using terrain data and satellite imagery draped over 3D terrain.
User Story: As a buyer, I want to see a realistic rendering of the view so I can visualize
what daily life would be like.
Acceptance Criteria:
360° panoramic image rendered from terrain data
Satellite imagery texture-mapped onto terrain
Ocean/sky rendered with appropriate colors
Compass bearings labeled
Time-of-day lighting optional (show golden hour, sunset)

Rendered using Three.js or Mapbox GL 3D terrain
Dependencies: F2, satellite imagery tiles, 3D rendering engine
F9: Tsunami Risk Overlay
Description: Overlay California’s official tsunami hazard zones on the map.
User Story: As a coastal property buyer, I want to see if a property is in a tsunami risk
zone so I can factor safety into my decision.
Acceptance Criteria:
California Geological Survey tsunami hazard area data imported
Color-coded overlay on map (red = in hazard zone, green = safe)
Per-property indicator: “In tsunami hazard zone” / “Outside tsunami hazard zone”
Data source attribution displayed
Data Source: California Geological Survey shapefiles (publicly available at
conservation.ca.gov/cgs/tsunami/maps)
F10: Sun Path Analysis
Description: Show the sun’s path across the sky from a given property to determine
sunset/sunrise visibility and solar exposure.
User Story: As a buyer, I want to know if I’ll see the sunset over the ocean from a
property.
Acceptance Criteria:
Sun path arc rendered on the viewshed map for a selected date
Sunset and sunrise points plotted on the horizon
“Sunset over ocean” boolean flag for west-facing coastal properties
Hours of direct sunlight estimated
Seasonal variation shown (summer vs winter sun paths)
Dependencies: SunCalc.js library, F2 viewshed data
F11: Save, Compare, and Share
Description: Users can save favorite properties/viewpoints, compare them side-by-

side, and share via link.
User Story: As a buyer researching over several weeks, I want to save and compare
properties so I can narrow my choices.
Acceptance Criteria:
Save to favorites (local storage for anonymous, account for registered)
Side-by-side comparison of 2-4 properties (view score, price, key metrics)
Shareable link that recreates the exact map view and analysis
Export comparison as image or PDF
Dependencies: User authentication (optional), state management
F12: View Report PDF Generation
Description: Generate a professional PDF report for a property’s view analysis.
User Story: As a real estate agent, I want to generate a shareable view report for my
clients.
Acceptance Criteria:
One-click PDF generation
Includes: map screenshot, viewshed overlay, panorama render, view score, elevation
profile, property details, tsunami zone status
Branded with ViewScout logo
Downloadable and shareable via link
Dependencies: PDF generation library (Puppeteer or jsPDF), F2-F10 data

Nice to Have (P2) — Future
F13: Street-Level View Correlation
Description: Integrate Google Street View or Mapillary imagery to show actual photos
from or near the property location.
User Story: As a buyer, I want to compare the computed viewshed with real photos to
validate the analysis.
F14: Building Obstruction Modeling

Description: Incorporate 3D building footprint data (OpenStreetMap 3D buildings,
Microsoft building footprints) to account for buildings blocking views.
User Story: As a buyer, I want to know if neighboring buildings block the ocean view,
not just terrain.
Technical Note: This significantly improves accuracy in urban/suburban areas where
terrain alone doesn’t account for 2-3 story buildings on adjacent lots.
F15: Historical View Change Analysis
Description: Show how views may have changed over time (new construction blocking
views) and flag approved developments that could affect future views.
User Story: As an investor, I want to know if a view is likely to be preserved or if new
construction could block it.
F16: Wildfire Risk Overlay
Description: Overlay wildfire risk zones, especially relevant for hilltop/elevated
properties that often have the best views but highest fire risk.
F17: Weather/Fog Analysis
Description: Incorporate historical fog/cloud data to estimate how often the view is
actually clear.
User Story: As a buyer, I want to know how many days per year I’ll actually see the
ocean vs. be socked in by fog.
F18: Mobile App
Description: Native iOS/Android app with AR mode — point your phone camera at the
landscape and see the viewshed overlaid in augmented reality.
F19: Agent Marketplace
Description: Connect buyers with local agents who specialize in view properties.
Monetization channel.
F20: API Access
Description: Expose ViewScout’s viewshed and ViewScore as an API for other real
estate platforms to integrate.

7. Information Architecture
Navigation Structure
┌─────────────────────────────────────────────────────┐
│

ViewScout Logo

Search Bar

[Filters] [Account] │

├─────────────────────────────────────────────────────┤
│

│

│

┌──────────────────────┐

┌──────────────────────┐│

│

│

│

│

Property Panel

││

│

│

│

│

(slides in from

││

│

│

MAP

│

│

right on click)

││

│

│

(full screen)

│

│

│

│

│

│

- Listing info

││

│

│

│

│

- View Score

││

│

│

│

│

- Viewshed map

││

│

│

│

│

- Elevation profile

││

│

│

│

│

- Panorama render

││

│

└──────────────────────┘

│

┌──────────────────────────────────────────────────┤

│

│

│

└──────────────────────────────────────────────────┘

││

└──────────────────────┘│

Elevation Profile / Compare Panel (bottom)

│

└─────────────────────────────────────────────────────┘

Primary Views
1. Map Explorer — Default view. Full-screen map with listing overlays.
2. Property Detail — Slide-in panel with full view analysis for one property.
3. Compare — Side-by-side comparison of saved properties.
4. Explore Mode — Click-anywhere viewshed analysis without listings.
5. View Report — Printable/shareable single-property analysis.

8. Design Requirements
Visual Design
Design Language: Clean, map-centric. The map IS the interface. Minimal chrome.
Color Scheme:

Primary: Deep ocean blue (#1a56db)
Accent: Sunset orange (#f97316)
ViewScore gradient: Green (#22c55e) → Yellow (#eab308) → Orange (#f97316) →
Gray (#9ca3af)
Viewshed overlay: Semi-transparent green (#22c55e at 30% opacity) for visible,
transparent for not visible
Tsunami zone: Semi-transparent red (#ef4444 at 20% opacity)
Typography: Inter or similar clean sans-serif. Map labels use the map’s native type.
Iconography: Lucide icons. Minimal icon set.

UX Principles
Map-first: The map takes 70%+ of screen real estate at all times
Progressive disclosure: Basic listing info on hover, full analysis on click, detailed report
on demand
Speed: Viewshed computation feedback within 500ms (show loading indicator), full
result within 3s
Mobile-responsive: Works on tablets (map-centric), degrades gracefully on phones
Accessibility: WCAG 2.1 AA compliance, keyboard navigable map, screen reader
support for property data

UI Components
Use shadcn/ui component library for panels, buttons, sliders, tooltips
Mapbox GL JS for map rendering
Recharts or Chart.js for elevation profiles and comparisons
Custom viewshed overlay canvas layer on Mapbox

9. Technical Requirements
Architecture

┌─────────────────────────────────────────────────────────────┐
│

FRONTEND

│

│

React (Next.js) + Mapbox GL JS + shadcn/ui + Tailwind

│

│

┌─────────────┐ ┌──────────────┐ ┌──────────────────┐

│

│

│ Map Engine

│ │ Viewshed

│ │ Property Panel

│

│

│

│ (Mapbox GL)

│ │ Renderer

│ │ (React)

│

│

│

│

│ │ (Canvas/

│ │

│

│

│

│

│ │

│ │

│

│

│

└─────────────┘ └──────────────┘ └──────────────────┘

WebGL)

│

└─────────────────────┬───────────────────────────────────────┘
│ REST API / WebSocket
┌─────────────────────▼───────────────────────────────────────┐
│

BACKEND

│

│

Node.js (Express or Hono) on Cloudflare Workers

│

│

┌──────────────┐ ┌──────────────┐ ┌──────────────────┐

│

│

│ Viewshed

│ │ Property

│

│

│

│ Compute API

│ │ Listings API │ │ API

│

│

│

└──────┬───────┘ └──────┬───────┘ └──────────────────┘

│

│

│

│ │ User/Auth

│

│

│

┌──────▼───────┐ ┌──────▼───────┐

│

│ Elevation

│

│ Tile Service │ │ Source

│

│ (R2 bucket)

│ │ (External

│

│

│ │

│

└──────────────┘ └──────────────┘

│

│ │ Listing Data │

│

│

│

│

API)

│
│

│
│

└─────────────────────────────────────────────────────────────┘
│
┌─────────────────────▼───────────────────────────────────────┐
│

DATA LAYER

│

│

┌──────────────┐ ┌──────────────┐ ┌──────────────────┐

│

│

│ Cloudflare

│ │ Cloudflare

│ │ Cloudflare

│

│

│

│ R2

│ │ D1

│ │ KV

│

│

│

│ (Elevation

│ │ (User data,

│ │ (Viewshed cache) │

│

│

│

tiles,

│ │

saved props,│ │

│

│

│

│

coastline)

│ │

reports)

│

│

│

└──────────────┘ └──────────────┘ └──────────────────┘

│

│ │

└─────────────────────────────────────────────────────────────┘

Tech Stack
Frontend: Next.js 14+ (React), TypeScript, Tailwind CSS, shadcn/ui
Map: Mapbox GL JS (terrain-v2 for 3D terrain, satellite imagery)
Charts: Recharts for elevation profiles

3D Rendering: Three.js for panorama renders (P1)
Backend: Cloudflare Workers (Hono framework) OR Node.js on Vercel
Database: Cloudflare D1 (SQLite) for user data, saved properties
Cache: Cloudflare KV for viewshed result caching
Storage: Cloudflare R2 for elevation tile storage
Auth: Clerk or Auth.js (optional for MVP, needed for save/compare)
PDF Generation: Puppeteer or @react-pdf/renderer (for P1 reports)

Viewshed Algorithm — Technical Specification
ALGORITHM: viewshed_compute(lat, lng, observer_height_m, radius_km)
INPUT:
- lat, lng: Observer position (WGS84)
- observer_height_m: Height above ground (default 3m for single story)
- radius_km: Analysis radius (default 20km, max 50km)
PROCESS:
1. Load DEM (Digital Elevation Model) tiles covering radius around observer
- Source: SRTM 30m (1 arc-second) tiles, pre-downloaded and stored in R2
- Tile format: GeoTIFF or custom binary for fast parsing
2. Determine observer elevation:
observer_elevation = DEM_elevation_at(lat, lng) + observer_height_m
3. For each azimuth bearing (0° to 359° in 0.5° increments = 720 rays):
Cast a ray from observer position outward to radius_km:
For each sample point along the ray (every 30m):
- Get terrain elevation from DEM
- Calculate angle from observer to this point:
angle = atan2(terrain_elevation - observer_elevation, distance)
- If angle > max_angle_so_far for this ray:
max_angle_so_far = angle
Mark this point as VISIBLE
- Else:
Mark this point as NOT VISIBLE (blocked by closer terrain)
- If point falls on water body (coastline check):
Record as WATER_VISIBLE with bearing and distance
4. Generate output:

- visibility_grid: 2D array of boolean (visible/not visible)
- water_visible: boolean
- water_bearings: array of {start_bearing, end_bearing, distance}
- water_arc_degrees: total degrees of water visibility
- view_score: computed from scoring formula
- horizon_profile: array of {bearing, elevation_angle, distance} for panorama rendering
OUTPUT:
- GeoJSON polygon of visible area (for map overlay)
- ViewScore (0-100)
- Water visibility metadata
- Horizon profile for panorama rendering
OPTIMIZATION:
- Cache results keyed by grid cell (round lat/lng to 3 decimal places ≈ 100m resolution)
- Pre-compute viewsheds for known property locations in batch
- Use WebAssembly for DEM parsing and ray casting (10-50x speedup over JS)
- Tile-based DEM loading: only fetch tiles that intersect the analysis radius

Elevation Data Pipeline
DATA SOURCE: NASA SRTM 30m (Shuttle Radar Topography Mission)
- Resolution: 1 arc-second (~30m at equator)
- Coverage: Global between 60°N and 56°S
- Format: HGT files (16-bit signed integers, heights in meters)
- Download: https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/
- California tiles needed: approximately 30-40 tiles
- Total storage: ~2-3 GB for California
PIPELINE:
1. Download SRTM HGT tiles for California coastal areas
2. Convert to optimized binary format (strip headers, compress)
3. Upload to Cloudflare R2 bucket
4. Backend loads tiles on-demand based on query location
5. Cache parsed tile data in memory/KV for repeat queries
ALTERNATIVE: Mapbox Terrain-RGB tiles
- Available via Mapbox API (already using Mapbox for map)
- Encoded as RGB PNG tiles where: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
- Advantage: Already tiled, served via CDN, consistent with map
- Disadvantage: Requires Mapbox API calls, potential rate limits
- Can be fetched client-side and computed in Web Worker

Water Body Detection

DATA SOURCE: OpenStreetMap coastline data OR Natural Earth 10m coastline
- Download processed coastline as GeoJSON
- Pre-process into a spatial index (e.g., R-tree via turf.js or rbush)
- For each ray in viewshed computation, check if endpoint falls on water
- Use "natural=coastline" tags from OSM for precise delineation
OPTIMIZATION:
- Rasterize coastline to same grid as DEM for fast lookup
- Create a binary "is_water" grid at 30m resolution for California coast
- Store alongside elevation tiles in R2

Performance Requirements
Viewshed computation: < 3 seconds for 20km radius (target: < 1.5s with WASM)
Map initial load: < 2 seconds
Property panel load: < 500ms
Search/filter update: < 200ms
Concurrent users: 1,000+ (Cloudflare Workers handles scaling)
Elevation tile fetch: < 200ms per tile from R2

Security Requirements
HTTPS everywhere
API rate limiting: 100 viewshed computations per hour per IP (free tier)
User authentication: OAuth (Google, Apple) via Clerk
No PII stored beyond email and saved preferences
CCPA compliant (California users)

Integration Requirements
Mapbox GL JS: Map rendering, terrain, satellite imagery
Property Data API: One of: RapidAPI/Zillow Bridge, Attom Data, or Redfin feed
Cloudflare: Workers (compute), R2 (storage), D1 (database), KV (cache)
SunCalc.js: Sun position calculations for sun path analysis (P1)
Turf.js: Geospatial operations (point-in-polygon, distance, bearing)

Analytics: PostHog or Plausible for privacy-friendly analytics

10. Data Requirements
Core Data Models
-- Viewshed cache
CREATE TABLE viewshed_cache (
id TEXT PRIMARY KEY,

-- hash of lat_lng_height_radius

lat REAL NOT NULL,
lng REAL NOT NULL,
observer_height REAL NOT NULL,
radius_km REAL NOT NULL,
view_score INTEGER,
water_visible BOOLEAN,
water_arc_degrees REAL,
water_bearings_json TEXT,

-- JSON array

visible_area_km2 REAL,
result_geojson TEXT,

-- compressed GeoJSON of visible area

horizon_profile_json TEXT,
computed_at TEXT NOT NULL,
expires_at TEXT NOT NULL
);
-- Saved properties (per user)
CREATE TABLE saved_properties (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
lat REAL NOT NULL,
lng REAL NOT NULL,
address TEXT,
listing_url TEXT,
listing_price INTEGER,
beds INTEGER,
baths REAL,
sqft INTEGER,
lot_sqft INTEGER,
view_score INTEGER,
water_visible BOOLEAN,
notes TEXT,
created_at TEXT NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Users
CREATE TABLE users (
id TEXT PRIMARY KEY,
email TEXT UNIQUE NOT NULL,
name TEXT,
created_at TEXT NOT NULL,
last_login TEXT
);
-- View reports (generated PDFs/links)
CREATE TABLE view_reports (
id TEXT PRIMARY KEY,
user_id TEXT,
lat REAL NOT NULL,
lng REAL NOT NULL,
address TEXT,
report_data_json TEXT,
share_token TEXT UNIQUE,

-- all computed data for the report
-- for shareable links

created_at TEXT NOT NULL
);

Analytics Events
viewshed_computed : lat, lng, observer_height, computation_time_ms, view_score
property_clicked : property_id, lat, lng, price, view_score
filter_applied : filter_type, filter_value
property_saved : property_id, view_score
report_generated : report_id, property_lat_lng
report_shared : report_id, share_method

11. Constraints and Assumptions
Technical Constraints
SRTM elevation data is 30m resolution — cannot detect individual buildings or trees
Building obstruction modeling (P2 feature F14) requires additional data sources
Viewshed computation is CPU-intensive; may need WASM optimization for client-side

Mapbox GL JS requires API key with usage-based pricing
Property listing data access varies by provider; some require licensing agreements

Business Constraints
MVP should be buildable by 1-2 developers in 4-6 weeks
Initial deployment on Cloudflare free/hobby tier to minimize costs
Property data licensing may require paid API subscription ($200-500/month)
Mapbox free tier allows 50K map loads/month, sufficient for launch

Assumptions
Users understand that viewshed analysis is based on terrain, not buildings/trees
(disclosed in methodology)
30m DEM resolution is sufficient for property buying decisions (not surveyor-grade)
Coastal California is the initial market (expand later)
Users will tolerate 2-3 second computation time for viewshed results
View quality meaningfully affects property value and buying decisions

12. Risks and Mitigation
Risk
Viewshed computation
too slow
Property data API access
denied or expensive

Likelihood

Impact

Medium

High

Use WASM, aggressive caching, precomputation for listed properties
MVP fallback: explore-mode only (no

Medium

High

listings), let users enter addresses
manually

DEM resolution
insufficient for urban

Mitigation

High

Medium

areas

Clearly disclose limitations; add
building data in P2
Focus on SEO (“ocean view homes

Low user adoption

Medium

High

California”), real estate agent
partnerships

Mapbox costs escalate
with usage

Legal issues with
property data display

Cache map tiles aggressively;
Low

Medium

consider open-source alternative
(MapLibre)

Low

High

Only link to source listings, don’t
reproduce full listing data

13. Launch Strategy
Phase 1: MVP (Weeks 1-6)
Explore mode: click-anywhere viewshed analysis for California coast
Manual address entry (no integrated listings)
ViewScore computation
Elevation profiles
Tsunami hazard zone overlay
Deploy on Cloudflare

Phase 2: Listings Integration (Weeks 7-10)
Integrate one property data source
View-based filtering on listings
Save/compare functionality
User accounts

Phase 3: Premium Features (Weeks 11-16)
Rendered panoramas (Three.js)
Sun path analysis
PDF report generation
Shareable view reports
Agent partnership program

Phase 4: Scale (Months 5-8)

Building obstruction data
Expand beyond California (Oregon, Washington, Hawaii, Florida)
Mobile app
API access for third parties
Weather/fog historical data

Launch Channels
Product Hunt launch
Reddit: r/RealEstate, r/California, r/SanDiego, r/OrangeCounty
Real estate agent Facebook groups
SEO: “ocean view homes [city]”, “can I see the ocean from [address]”
Partnership with 2-3 coastal California brokerages

14. File Structure for Implementation
viewscout/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example

# API keys template

├── public/
│

└── favicon.ico

├── src/
│

├── app/

│

│

├── layout.tsx

# Root layout

│

│

├── page.tsx

# Main map explorer page

│

│

├── report/[id]/page.tsx

# Shareable view report page

│

│

└── api/

│

│

├── viewshed/route.ts

│

│

├── properties/route.ts # Property listing proxy

│

│

├── elevation/route.ts

# Elevation tile serving

│

│

└── report/route.ts

# Report generation

│

├── components/

│

│

├── Map/

│

│

│

├── MapContainer.tsx

# Viewshed computation endpoint

# Main Mapbox GL wrapper

│

│

│

├── ViewshedLayer.tsx

│

│

│

├── PropertyMarkers.tsx # Property listing pins

│

│

│

├── TsunamiLayer.tsx

│

│

│

└── ElevationProfile.tsx # Cross-section chart

│

│

├── Panel/

│

│

│

├── PropertyPanel.tsx

# Right slide-in property detail

│

│

│

├── FilterPanel.tsx

# Search filters including view filters

│

│

│

├── ComparePanel.tsx

# Side-by-side comparison

│

│

│

└── ViewScoreCard.tsx

# View quality score display

│

│

├── Search/

│

│

│

│

│

└── Report/

│

│

│

├── lib/

│

│

├── viewshed/

│

│

│

├── compute.ts

# Core viewshed algorithm

│

│

│

├── dem.ts

# DEM tile loading and parsing

│

│

│

├── water.ts

# Water body detection

│

│

│

├── score.ts

# ViewScore calculation

│

│

│

└── worker.ts

# Web Worker for computation

│

│

├── elevation/

│

│

│

├── srtm.ts

# SRTM tile parsing

│

│

│

└── cache.ts

# Tile caching logic

│

│

├── geo/

│

│

│

├── coastline.ts

# Coastline data loading

│

│

│

├── tsunami.ts

# Tsunami zone data

│

│

│

└── sunpath.ts

# Sun position calculations

│

│

├── api/

│

│

│

│

│

└── utils/

│

│

├── geo.ts

# Geo utilities (distance, bearing, etc.)

│

│

└── format.ts

# Number/currency formatting

│

├── hooks/

│

│

├── useViewshed.ts

# Viewshed computation hook

│

│

├── useProperties.ts

# Property data hook

│

│

└── useMapState.ts

# Map position/zoom state

│

├── stores/

│

│

│

└── types/

└── SearchBar.tsx
└── ViewReport.tsx

└── properties.ts

└── appStore.ts

# Viewshed overlay on map
# Tsunami zone overlay

# Location search
# Printable view report

# Property data fetching

# Zustand store for app state

│

├── viewshed.ts

# Viewshed types

│

├── property.ts

# Property listing types

│

└── map.ts

# Map state types

├── data/
│

├── coastline/

# Pre-processed coastline GeoJSON

│

└── tsunami/

# Tsunami hazard zone GeoJSON

├── scripts/
│

├── download-srtm.ts

# Script to download SRTM tiles

│

├── process-coastline.ts

# Process coastline data

│

├── process-tsunami.ts

# Process tsunami zone shapefiles

│

└── upload-to-r2.ts

# Upload processed data to R2

└── workers/
└── viewshed-worker/

# Optional: Cloudflare Worker for compute

├── index.ts
└── wrangler.toml

15. Environment Variables
# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
# Property Data API (choose one)
ATTOM_API_KEY=xxx
# OR
RAPIDAPI_KEY=xxx
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY=xxx
CLOUDFLARE_R2_SECRET_KEY=xxx
CLOUDFLARE_R2_BUCKET=viewscout-elevation
CLOUDFLARE_D1_DATABASE_ID=xxx
CLOUDFLARE_KV_NAMESPACE_ID=xxx
# Auth (optional for MVP)
CLERK_SECRET_KEY=xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxx
# Analytics
POSTHOG_KEY=xxx

16. MVP Implementation Priority Order
For Claude Code, implement in this sequence:
1. Set up Next.js project with Tailwind, shadcn/ui, TypeScript
2. Map component — Mapbox GL JS with terrain layer, satellite toggle
3. Elevation data pipeline — SRTM tile download script, R2 upload, tile serving API

4. Viewshed computation engine — Core algorithm in TypeScript, Web Worker wrapper
5. Water detection — Coastline GeoJSON loading, water visibility check
6. ViewScore calculation — Scoring formula implementation
7. Click-to-analyze UI — Click map → compute viewshed → render overlay
8. Elevation profile chart — Click property then click ocean → show cross-section
9. Search bar — Location search with Mapbox Geocoding API
10. Filter panel — Standard + view-based filters
11. Property panel — Slide-in detail view with all analysis data
12. Tsunami overlay — Load and render California tsunami hazard zones
13. Save/compare — Local storage based favorites and comparison
14. Shareable links — URL state encoding for sharing map views

