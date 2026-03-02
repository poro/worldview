import * as Cesium from 'cesium';

// Iran major cities polygon (simplified coverage)
const IRAN_BLACKOUT_POLYGON: [number, number][] = [
  [49.5, 37.5], [52.0, 37.0], [54.0, 36.5], [55.0, 36.0],
  [54.5, 34.5], [53.0, 33.0], [52.0, 32.5], [51.0, 32.5],
  [50.0, 33.0], [49.0, 34.0], [49.0, 36.0], [49.5, 37.5],
];

export class InternetBlackoutLayer {
  private viewer: Cesium.Viewer;
  private entities: Cesium.Entity[] = [];
  private _visible: boolean = true;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }

  load() {
    const positions = IRAN_BLACKOUT_POLYGON.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat)
    );

    // Dark overlay polygon
    const polygon = this.viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: Cesium.Color.fromCssColorString('#1a0000').withAlpha(0.4),
        outline: true,
        outlineColor: Cesium.Color.RED.withAlpha(0.5),
        height: 0,
      },
      properties: { type: 'internet-blackout' },
      show: this._visible,
    });
    this.entities.push(polygon);

    // Label
    const label = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(51.4, 35.7, 0),
      label: {
        text: 'TEHRAN INTERNET BLACKOUT',
        font: 'bold 14px JetBrains Mono',
        fillColor: Cesium.Color.RED.withAlpha(0.9),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.3),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
      },
      properties: { type: 'internet-blackout-label' },
      show: this._visible,
    });
    this.entities.push(label);

    // Secondary labels
    const secondaryLabel = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(51.4, 34.8, 0),
      label: {
        text: 'ALL COMMUNICATIONS SEVERED',
        font: '10px JetBrains Mono',
        fillColor: Cesium.Color.fromCssColorString('#ff6666').withAlpha(0.7),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 8e6, 0.2),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
      },
      properties: { type: 'internet-blackout-label' },
      show: this._visible,
    });
    this.entities.push(secondaryLabel);
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach(e => (e.show = this._visible));
  }
}
