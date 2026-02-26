import * as Cesium from 'cesium';
import { ViewshedResult } from './compute';

let overlayEntities: Cesium.Entity[] = [];
let observerEntity: Cesium.Entity | null = null;

/**
 * Render viewshed overlay on the globe.
 * Green semi-transparent = visible, red semi-transparent = not visible.
 */
export function renderViewshedOverlay(viewer: Cesium.Viewer, result: ViewshedResult): void {
  clearOverlay(viewer);

  const step = result.rays.length > 1
    ? (result.rays[1].azimuth - result.rays[0].azimuth)
    : 5;

  for (const ray of result.rays) {
    for (const sample of ray.samples) {
      const color = sample.visible
        ? Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.25)
        : Cesium.Color.fromCssColorString('#ff3d3d').withAlpha(0.1);

      // Size scales with distance
      const semiMajor = (result.rays[0].samples[1]?.distance - result.rays[0].samples[0]?.distance || 250) * 0.5;
      const semiMinor = semiMajor * Math.max(0.5, step / 10);

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(sample.lon, sample.lat, sample.elevation + 1),
        ellipse: {
          semiMajorAxis: semiMajor,
          semiMinorAxis: semiMinor,
          material: new Cesium.ColorMaterialProperty(color),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });

      overlayEntities.push(entity);
    }
  }

  // Observer marker
  observerEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      result.observerLon,
      result.observerLat,
      result.terrainHeight + result.observerHeight,
    ),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#00ff88'),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.NONE,
    },
    label: {
      text: 'OBSERVER',
      font: '10px monospace',
      fillColor: Cesium.Color.fromCssColorString('#00ff88'),
      style: Cesium.LabelStyle.FILL,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -16),
    },
  });
}

export function clearOverlay(viewer: Cesium.Viewer): void {
  for (const e of overlayEntities) {
    viewer.entities.remove(e);
  }
  overlayEntities = [];
  if (observerEntity) {
    viewer.entities.remove(observerEntity);
    observerEntity = null;
  }
}
