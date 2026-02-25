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

async function fetchRegion(lat: number, lon: number, dist: number): Promise<any> {
  const target = `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  const url = `${PROXY}/?url=${encodeURIComponent(target)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    const target = bounds 
      ? `https://opendata.adsb.fi/api/v2/lat/${((bounds.lamin+bounds.lamax)/2).toFixed(1)}/lon/${((bounds.lomin+bounds.lomax)/2).toFixed(1)}/dist/250`
      : `https://opendata.adsb.fi/api/v2/lat/39/lon/-77/dist/250`;
    const url = `/adsbfi${new URL(target).pathname}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('adsb.fi dev error');
    return adsbfiToOpenSky(await response.json());
  }

  // Production: fetch all regions in parallel for global coverage
  try {
    const results = await Promise.allSettled(
      GLOBAL_REGIONS.map(r => fetchRegion(r.lat, r.lon, 250))
    );

    const allAircraft: any[] = [];
    const seen = new Set<string>();
    let now = Date.now() / 1000;

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
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

    console.log(`[WORLDVIEW] Flights: ${allAircraft.length} from ${GLOBAL_REGIONS.length} regions`);
    return adsbfiToOpenSky({ now, aircraft: allAircraft });
  } catch (e) {
    console.error('Flight fetch failed:', e);
    return { time: Date.now() / 1000, states: null };
  }
}
