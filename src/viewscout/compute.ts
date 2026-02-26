import * as Cesium from 'cesium';

export interface ViewshedResult {
  observerLon: number;
  observerLat: number;
  observerHeight: number;
  terrainHeight: number;
  /** For each ray: azimuth in degrees, array of { distance, visible, lat, lon, elevation } */
  rays: RayResult[];
  visibleCount: number;
  totalCount: number;
  visibleFraction: number;
}

export interface RaySample {
  distance: number;
  lat: number;
  lon: number;
  elevation: number;
  visible: boolean;
}

export interface RayResult {
  azimuth: number;
  samples: RaySample[];
}

const EARTH_RADIUS = 6371000; // meters

/** Destination point given start, bearing (deg), distance (m) */
function destinationPoint(lat: number, lon: number, bearing: number, distance: number): [number, number] {
  const φ1 = lat * Math.PI / 180;
  const λ1 = lon * Math.PI / 180;
  const θ = bearing * Math.PI / 180;
  const δ = distance / EARTH_RADIUS;

  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

  return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI];
}

/**
 * Compute viewshed from a point using Cesium terrain sampling.
 * Casts rays in all directions and checks line-of-sight.
 */
export async function computeViewshed(
  lon: number,
  lat: number,
  observerHeightAboveGround: number = 3,
  radiusMeters: number = 10000,
  numAzimuths: number = 72,
  numSamplesPerRay: number = 40,
): Promise<ViewshedResult> {
  const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1); // Cesium World Terrain

  // Sample observer terrain height
  const observerCarto = [Cesium.Cartographic.fromDegrees(lon, lat)];
  const observerSampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, observerCarto);
  const terrainHeight = observerSampled[0].height || 0;
  const observerElevation = terrainHeight + observerHeightAboveGround;

  // Build all sample points for all rays
  const allCartos: Cesium.Cartographic[] = [];
  const rayMeta: { azimuth: number; startIdx: number; count: number }[] = [];

  for (let a = 0; a < numAzimuths; a++) {
    const azimuth = (360 / numAzimuths) * a;
    const startIdx = allCartos.length;

    for (let s = 1; s <= numSamplesPerRay; s++) {
      const dist = (radiusMeters / numSamplesPerRay) * s;
      const [sLat, sLon] = destinationPoint(lat, lon, azimuth, dist);
      allCartos.push(Cesium.Cartographic.fromDegrees(sLon, sLat));
    }

    rayMeta.push({ azimuth, startIdx, count: numSamplesPerRay });
  }

  // Batch sample all terrain heights
  const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, allCartos);

  // Process each ray for line-of-sight
  let visibleCount = 0;
  let totalCount = 0;
  const rays: RayResult[] = [];

  for (const meta of rayMeta) {
    let maxAngle = -Infinity;
    const samples: RaySample[] = [];

    for (let i = 0; i < meta.count; i++) {
      const idx = meta.startIdx + i;
      const carto = sampled[idx];
      const sampleElev = carto.height || 0;
      const dist = (radiusMeters / numSamplesPerRay) * (i + 1);

      // Angle from observer to sample point (accounting for earth curvature approximation)
      const curvatureDrop = (dist * dist) / (2 * EARTH_RADIUS);
      const effectiveElev = sampleElev - curvatureDrop;
      const elevDiff = effectiveElev - observerElevation;
      const angle = Math.atan2(elevDiff, dist);

      const visible = angle > maxAngle || i === 0;
      if (angle > maxAngle) maxAngle = angle;

      totalCount++;
      if (visible) visibleCount++;

      samples.push({
        distance: dist,
        lat: Cesium.Math.toDegrees(carto.latitude),
        lon: Cesium.Math.toDegrees(carto.longitude),
        elevation: sampleElev,
        visible,
      });
    }

    rays.push({ azimuth: meta.azimuth, samples });
  }

  return {
    observerLon: lon,
    observerLat: lat,
    observerHeight: observerHeightAboveGround,
    terrainHeight,
    rays,
    visibleCount,
    totalCount,
    visibleFraction: totalCount > 0 ? visibleCount / totalCount : 0,
  };
}

/**
 * Get elevation profile between two points.
 */
export async function getElevationProfile(
  fromLon: number, fromLat: number,
  toLon: number, toLat: number,
  numSamples: number = 50,
): Promise<{ distance: number; elevation: number; lat: number; lon: number }[]> {
  const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);

  const cartos: Cesium.Cartographic[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const sLat = fromLat + (toLat - fromLat) * t;
    const sLon = fromLon + (toLon - fromLon) * t;
    cartos.push(Cesium.Cartographic.fromDegrees(sLon, sLat));
  }

  const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartos);

  // Calculate distances
  const fromRad = Cesium.Cartographic.fromDegrees(fromLon, fromLat);
  const toRad = Cesium.Cartographic.fromDegrees(toLon, toLat);
  const totalDist = Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromRadians(fromRad.longitude, fromRad.latitude),
    Cesium.Cartesian3.fromRadians(toRad.longitude, toRad.latitude),
  );

  return sampled.map((c, i) => ({
    distance: (i / numSamples) * totalDist,
    elevation: c.height || 0,
    lat: Cesium.Math.toDegrees(c.latitude),
    lon: Cesium.Math.toDegrees(c.longitude),
  }));
}
