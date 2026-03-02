import * as Cesium from 'cesium';

const COUNTRY_LABELS = [
  { name: 'IRAN', lon: 53, lat: 32 },
  { name: 'IRAQ', lon: 44, lat: 33 },
  { name: 'KUWAIT', lon: 47.5, lat: 29.3 },
  { name: 'BAHRAIN', lon: 50.5, lat: 26 },
  { name: 'QATAR', lon: 51.2, lat: 25.3 },
  { name: 'UNITED ARAB EMIRATES', lon: 54, lat: 24 },
  { name: 'SAUDI ARABIA', lon: 45, lat: 24 },
  { name: 'OMAN', lon: 57, lat: 21 },
  { name: 'TURKEY', lon: 35, lat: 39 },
  { name: 'SYRIA', lon: 38, lat: 35 },
  { name: 'JORDAN', lon: 36, lat: 31 },
  { name: 'ISRAEL', lon: 35, lat: 31.5 },
  { name: 'LEBANON', lon: 35.8, lat: 33.8 },
  { name: 'AFGHANISTAN', lon: 67, lat: 33 },
  { name: 'PAKISTAN', lon: 69, lat: 30 },
];

export class CountryLayer {
  private viewer: Cesium.Viewer;
  private dataSource: Cesium.GeoJsonDataSource | null = null;
  private labelEntities: Cesium.Entity[] = [];
  private _visible: boolean = true;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }

  async load() {
    try {
      this.dataSource = await Cesium.GeoJsonDataSource.load('/data/borders.geojson', {
        stroke: Cesium.Color.fromCssColorString('#ff6688').withAlpha(0.5),
        strokeWidth: 1.5,
        fill: Cesium.Color.TRANSPARENT,
      });
      this.viewer.dataSources.add(this.dataSource);
    } catch (e) {
      console.warn('[CountryLayer] borders.geojson load failed:', e);
    }

    // Add country labels
    for (const c of COUNTRY_LABELS) {
      const entity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat),
        label: {
          text: c.name,
          font: '11px JetBrains Mono',
          fillColor: Cesium.Color.WHITE.withAlpha(0.6),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.4),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.5e7),
        },
        properties: { type: 'country-label' },
        show: this._visible,
      });
      this.labelEntities.push(entity);
    }
  }

  toggle() {
    this._visible = !this._visible;
    if (this.dataSource) this.dataSource.show = this._visible;
    this.labelEntities.forEach(e => (e.show = this._visible));
  }
}
