import { ViewshedResult } from './compute';

export interface WaterVisibility {
  oceanVisible: boolean;
  /** Degrees of arc where ocean/water is visible */
  arcDegrees: number;
  /** Start and end bearings of visible water segments */
  segments: { startBearing: number; endBearing: number }[];
  /** Classification */
  classification: 'Panoramic' | 'Wide' | 'Partial' | 'Peek-a-boo' | 'None';
  /** Distance to nearest visible water point (meters) */
  nearestWaterDistance: number | null;
  /** Bearing to nearest visible water */
  nearestWaterBearing: number | null;
}

/**
 * Heuristic: if a visible sample has elevation near sea level (< 2m)
 * and is far enough from observer, it's likely ocean/water.
 */
const WATER_ELEVATION_THRESHOLD = 2; // meters
const MIN_WATER_DISTANCE = 200; // meters — avoid false positives from nearby flat ground

export function detectWaterVisibility(result: ViewshedResult): WaterVisibility {
  const waterAzimuths: Set<number> = new Set();
  let nearestDist: number | null = null;
  let nearestBearing: number | null = null;

  for (const ray of result.rays) {
    for (const sample of ray.samples) {
      if (
        sample.visible &&
        sample.elevation <= WATER_ELEVATION_THRESHOLD &&
        sample.distance >= MIN_WATER_DISTANCE
      ) {
        waterAzimuths.add(ray.azimuth);
        if (nearestDist === null || sample.distance < nearestDist) {
          nearestDist = sample.distance;
          nearestBearing = ray.azimuth;
        }
        break; // Only need first water hit per ray
      }
    }
  }

  const oceanVisible = waterAzimuths.size > 0;

  // Calculate contiguous segments
  const sortedAzimuths = Array.from(waterAzimuths).sort((a, b) => a - b);
  const step = result.rays.length > 0 ? 360 / result.rays.length : 5;
  const segments: { startBearing: number; endBearing: number }[] = [];

  if (sortedAzimuths.length > 0) {
    let segStart = sortedAzimuths[0];
    let prev = sortedAzimuths[0];

    for (let i = 1; i < sortedAzimuths.length; i++) {
      const curr = sortedAzimuths[i];
      if (curr - prev > step * 1.5) {
        segments.push({ startBearing: segStart, endBearing: prev + step });
        segStart = curr;
      }
      prev = curr;
    }
    segments.push({ startBearing: segStart, endBearing: prev + step });

    // Check wrap-around (last segment connects to first)
    if (segments.length > 1) {
      const first = segments[0];
      const last = segments[segments.length - 1];
      if (last.endBearing >= 360 && first.startBearing <= step) {
        segments[segments.length - 1].endBearing = first.endBearing;
        segments.shift();
      }
    }
  }

  const arcDegrees = waterAzimuths.size * step;

  let classification: WaterVisibility['classification'];
  if (arcDegrees > 90) classification = 'Panoramic';
  else if (arcDegrees > 45) classification = 'Wide';
  else if (arcDegrees > 15) classification = 'Partial';
  else if (arcDegrees > 0) classification = 'Peek-a-boo';
  else classification = 'None';

  return {
    oceanVisible,
    arcDegrees,
    segments,
    classification,
    nearestWaterDistance: nearestDist,
    nearestWaterBearing: nearestBearing,
  };
}
