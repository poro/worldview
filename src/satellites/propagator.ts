import * as satellite from 'satellite.js';
import { TLERecord } from './tle';

export interface SatellitePosition {
  lat: number;
  lon: number;
  alt: number; // km
  velocity: number; // km/s
  name: string;
  noradId: string;
  category: string;
  inclination: number;
}

export function propagateSatellite(tle: TLERecord, date: Date): SatellitePosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const posVel = satellite.propagate(satrec, date);

    if (typeof posVel.position === 'boolean' || !posVel.position) return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);

    const lon = satellite.degreesLong(geo.longitude);
    const lat = satellite.degreesLat(geo.latitude);
    const alt = geo.height; // km

    if (isNaN(lon) || isNaN(lat) || isNaN(alt)) return null;

    let velocity = 0;
    if (typeof posVel.velocity !== 'boolean' && posVel.velocity) {
      const v = posVel.velocity as satellite.EciVec3<number>;
      velocity = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    const noradId = tle.line1.substring(2, 7).trim();
    const inclination = parseFloat(tle.line2.substring(8, 16).trim());

    return { lat, lon, alt, velocity, name: tle.name, noradId, category: tle.category, inclination };
  } catch {
    return null;
  }
}

export function computeOrbitPath(tle: TLERecord, date: Date, steps: number = 120): { lat: number; lon: number; alt: number }[] {
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  const period = (2 * Math.PI) / satrec.no; // minutes
  const points: { lat: number; lon: number; alt: number }[] = [];

  for (let i = 0; i < steps; i++) {
    const t = new Date(date.getTime() + (i / steps) * period * 60 * 1000);
    try {
      const posVel = satellite.propagate(satrec, t);
      if (typeof posVel.position === 'boolean' || !posVel.position) continue;
      const gmst = satellite.gstime(t);
      const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
      const lon = satellite.degreesLong(geo.longitude);
      const lat = satellite.degreesLat(geo.latitude);
      const alt = geo.height;
      if (!isNaN(lon) && !isNaN(lat) && !isNaN(alt)) {
        points.push({ lat, lon, alt });
      }
    } catch {
      continue;
    }
  }

  return points;
}
