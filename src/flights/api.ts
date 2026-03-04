import { OpenSkyResponse } from './types';

const PROXY = 'https://worldview-proxy.mark-ollila.workers.dev';

// Convert adsb.fi response to OpenSky format for compatibility
function adsbfiToOpenSky(data: any): OpenSkyResponse {
  const aircraft = data.aircraft || data.ac;
  if (!aircraft || aircraft.length === 0) return { time: data.now || Date.now() / 1000, states: null };
  
  const states = aircraft.map((ac: any) => [
    ac.hex || '',           // 0: icao24
    ac.flight || '',        // 1: callsign
    ac.r || 'Unknown',      // 2: origin country (registration country)
    data.now,               // 3: timePosition
    data.now,               // 4: lastContact
    ac.lon ?? null,         // 5: longitude
    ac.lat ?? null,         // 6: latitude
    ac.alt_baro === 'ground' ? 0 : (ac.alt_baro != null ? ac.alt_baro * 0.3048 : null), // 7: baro altitude (ft→m)
    ac.alt_baro === 'ground', // 8: onGround
    ac.gs != null ? ac.gs * 0.514444 : null, // 9: velocity (kts→m/s)
    ac.track ?? null,       // 10: trueTrack
    ac.baro_rate != null ? ac.baro_rate * 0.00508 : null, // 11: verticalRate (fpm→m/s)
    null,                   // 12: sensors
    ac.alt_geom != null ? ac.alt_geom * 0.3048 : null, // 13: geoAltitude (ft→m)
    ac.squawk ?? null,      // 14: squawk
  ]);

  return { time: data.now || Date.now() / 1000, states };
}

// Global coverage regions (centers + 250nm radius each)
const GLOBAL_REGIONS = [
  // North America
  { lat: 40, lon: -100 },  // Central US
  { lat: 35, lon: -80 },   // Southeast US
  { lat: 47, lon: -120 },  // Pacific NW
  { lat: 30, lon: -95 },   // Gulf Coast
  { lat: 45, lon: -73 },   // Northeast US/Canada
  { lat: 33, lon: -112 },  // Southwest US
  { lat: 55, lon: -100 },  // Central Canada
  { lat: 25, lon: -80 },   // Florida/Caribbean
  { lat: 20, lon: -100 },  // Mexico
  // Europe
  { lat: 51, lon: 0 },     // UK/France
  { lat: 50, lon: 10 },    // Central Europe
  { lat: 48, lon: 20 },    // Eastern Europe
  { lat: 60, lon: 15 },    // Scandinavia
  { lat: 40, lon: -4 },    // Iberia
  { lat: 42, lon: 15 },    // Mediterranean
  { lat: 55, lon: 37 },    // Russia West
  // Asia
  { lat: 35, lon: 140 },   // Japan
  { lat: 30, lon: 120 },   // East China
  { lat: 22, lon: 114 },   // Hong Kong/SE Asia
  { lat: 13, lon: 100 },   // Thailand
  { lat: 25, lon: 55 },    // Middle East
  { lat: 28, lon: 77 },    // India
  { lat: 37, lon: 127 },   // Korea
  // Southern Hemisphere
  { lat: -34, lon: 151 },  // Australia
  { lat: -23, lon: -46 },  // Brazil
  { lat: -34, lon: 18 },   // South Africa
];

// Simple in-memory cache for flight data (avoids hammering the proxy)
const regionCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 12000; // 12s — flights update every 15s

async function fetchRegion(lat: number, lon: number, dist: number): Promise<any> {
  const key = `${lat},${lon}`;
  const cached = regionCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const target = `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  const url = `${PROXY}/?url=${encodeURIComponent(target)}`;
  const response = await fetch(url);
  if (response.status === 429) {
    // Rate limited — retry after 2s
    await new Promise(r => setTimeout(r, 2000));
    const retry = await fetch(url);
    if (!retry.ok) return cached?.data ?? null; // Return stale cache if available
    const data = await retry.json();
    regionCache.set(key, { data, ts: Date.now() });
    return data;
  }
  if (!response.ok) return cached?.data ?? null;
  const data = await response.json();
  regionCache.set(key, { data, ts: Date.now() });
  return data;
}

/**
 * Fetch flights from server-side aggregated JSON file.
 * The flight-aggregator.py systemd timer writes /public/flights.json every 15s.
 * Client makes ONE request instead of 26 parallel API calls.
 * Falls back to direct API calls if the aggregated file isn't available.
 */
export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  // Try server-side aggregated data first (single file, no rate limits)
  try {
    const resp = await fetch('/flights.json');
    if (resp.ok) {
      const data = await resp.json();
      const aircraft = data.aircraft || [];
      const src = data.source || 'adsb.fi';
      console.log(`[WORLDVIEW] Flights: ${aircraft.length} aircraft via ${src} (${data.regions || '?'})`);
      return adsbfiToOpenSky({ now: data.now || Date.now() / 1000, aircraft });
    }
  } catch (e) {
    console.warn('[WORLDVIEW] Aggregated flights unavailable, falling back to direct API');
  }

  // Fallback: direct API calls via proxy (rate-limited but works as backup)
  try {
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 2000;
    const allAircraft: any[] = [];
    const seen = new Set<string>();
    let now = Date.now() / 1000;
    let successCount = 0;

    for (let i = 0; i < GLOBAL_REGIONS.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY));
      const batch = GLOBAL_REGIONS.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(r => fetchRegion(r.lat, r.lon, 250))
      );

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        successCount++;
        const data = result.value;
        if (data.now) now = data.now;
        const aircraft = data.aircraft || data.ac || [];
        for (const ac of aircraft) {
          const id = ac.hex || ac.icao24;
          if (id && !seen.has(id)) {
            seen.add(id);
            allAircraft.push(ac);
          }
        }
      }
    }

    console.log(`[WORLDVIEW] Flights: ${allAircraft.length} from ${successCount}/${GLOBAL_REGIONS.length} regions (direct)`);
    return adsbfiToOpenSky({ now, aircraft: allAircraft });
  } catch (e) {
    console.error('Flight fetch failed:', e);
    return { time: Date.now() / 1000, states: null };
  }
}
