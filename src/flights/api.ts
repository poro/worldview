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

export async function fetchFlights(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<OpenSkyResponse> {
  const isDev = import.meta.env.DEV;

  // Use adsb.fi — dist is in nautical miles, max ~250 works reliably through proxy
  let target: string;
  if (bounds) {
    const lat = ((bounds.lamin + bounds.lamax) / 2).toFixed(4);
    const lon = ((bounds.lomin + bounds.lomax) / 2).toFixed(4);
    const dist = Math.min(250, Math.max(50, Math.round(
      Math.abs(bounds.lamax - bounds.lamin) * 60 / 2
    )));
    target = `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  } else {
    // Default: centered on US east coast, 250nm radius
    target = 'https://opendata.adsb.fi/api/v2/lat/39/lon/-77/dist/250';
  }

  const url = isDev
    ? `/adsbfi${new URL(target).pathname}`
    : `${PROXY}/?url=${encodeURIComponent(target)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`adsb.fi error: ${response.status}`);
    const data = await response.json();
    return adsbfiToOpenSky(data);
  } catch (e) {
    // Fallback to OpenSky
    const osTarget = 'https://opensky-network.org/api/states/all';
    const osUrl = isDev ? '/opensky/api/states/all' : `${PROXY}/?url=${encodeURIComponent(osTarget)}`;
    try {
      const response = await fetch(osUrl);
      if (!response.ok) throw new Error(`OpenSky error: ${response.status}`);
      return response.json();
    } catch {
      console.error('Both flight APIs failed');
      return { time: Date.now() / 1000, states: null };
    }
  }
}
