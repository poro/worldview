import { ViewshedResult } from './compute';
import { WaterVisibility } from './water';

export interface ViewScore {
  total: number; // 0-100
  breakdown: {
    terrainVisibility: number;  // 0-30 — % of terrain visible
    waterBonus: number;         // 0-30 — ocean/water visibility
    elevationAdvantage: number; // 0-20 — height above surroundings
    viewDistance: number;       // 0-20 — max unobstructed distance
  };
}

/**
 * Compute ViewScore (0-100) based on viewshed results and water visibility.
 *
 * Formula:
 *   terrainVisibility = visibleFraction * 30
 *   waterBonus = min(arcDegrees / 120, 1) * 30
 *   elevationAdvantage = min(relativeHeight / 100, 1) * 20
 *   viewDistance = min(maxVisibleDist / radius, 1) * 20
 */
export function computeViewScore(
  result: ViewshedResult,
  water: WaterVisibility,
): ViewScore {
  // Terrain visibility: fraction of samples that are visible (max 30)
  const terrainVisibility = Math.round(result.visibleFraction * 30);

  // Water bonus: based on arc degrees of visible water (max 30)
  const waterBonus = Math.round(Math.min(water.arcDegrees / 120, 1) * 30);

  // Elevation advantage: observer height above average surrounding terrain (max 20)
  let avgSurroundingElev = 0;
  let elevCount = 0;
  for (const ray of result.rays) {
    for (const s of ray.samples) {
      avgSurroundingElev += s.elevation;
      elevCount++;
    }
  }
  avgSurroundingElev = elevCount > 0 ? avgSurroundingElev / elevCount : 0;
  const relativeHeight = (result.terrainHeight + result.observerHeight) - avgSurroundingElev;
  const elevationAdvantage = Math.round(Math.min(Math.max(relativeHeight, 0) / 100, 1) * 20);

  // View distance: max unobstructed visible distance (max 20)
  let maxVisibleDist = 0;
  for (const ray of result.rays) {
    for (const s of ray.samples) {
      if (s.visible && s.distance > maxVisibleDist) {
        maxVisibleDist = s.distance;
      }
    }
  }
  const radius = result.rays[0]?.samples[result.rays[0].samples.length - 1]?.distance || 10000;
  const viewDistance = Math.round(Math.min(maxVisibleDist / radius, 1) * 20);

  const total = Math.min(100, terrainVisibility + waterBonus + elevationAdvantage + viewDistance);

  return {
    total,
    breakdown: { terrainVisibility, waterBonus, elevationAdvantage, viewDistance },
  };
}
