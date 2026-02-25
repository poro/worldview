import * as Cesium from 'cesium';

export interface Earthquake {
  id: string;
  title: string;
  magnitude: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  url: string;
}

export class EarthquakeLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private earthquakes: Earthquake[] = [];
  private _visible: boolean = true;
  private onSelect: ((eq: Earthquake | null) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean {
    return this._visible;
  }

  get quakeCount(): number {
    return this.earthquakes.length;
  }

  get data(): Earthquake[] {
    return this.earthquakes;
  }

  setOnSelect(cb: (eq: Earthquake | null) => void) {
    this.onSelect = cb;
  }

  async load() {
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson');
      if (!res.ok) throw new Error(`USGS error: ${res.status}`);
      const data = await res.json();

      this.earthquakes = data.features.map((f: any) => ({
        id: f.id,
        title: f.properties.title,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        url: f.properties.url,
      }));

      this.render();
    } catch (e) {
      console.warn('Earthquake data load failed:', e);
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
  }

  handlePick(pickedObject: any): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'earthquake') {
        const eqId = pickedObject.id.properties.eqId.getValue(Cesium.JulianDate.now());
        const eq = this.earthquakes.find((e) => e.id === eqId);
        this.onSelect?.(eq || null);
        return true;
      }
    }
    return false;
  }

  private render() {
    for (const eq of this.earthquakes) {
      const size = Math.max(10, eq.magnitude * 6);
      const alpha = Math.min(1.0, eq.magnitude / 8);
      const color = eq.magnitude >= 6
        ? Cesium.Color.RED.withAlpha(alpha)
        : eq.magnitude >= 4
        ? Cesium.Color.ORANGE.withAlpha(alpha)
        : Cesium.Color.YELLOW.withAlpha(alpha);

      const entity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(eq.lon, eq.lat, 0),
        point: {
          pixelSize: size,
          color,
          outlineColor: Cesium.Color.fromCssColorString('#ff3d3d').withAlpha(0.3),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        ellipse: {
          semiMajorAxis: eq.magnitude * 50000,
          semiMinorAxis: eq.magnitude * 50000,
          material: Cesium.Color.RED.withAlpha(0.08),
          outline: true,
          outlineColor: Cesium.Color.RED.withAlpha(0.2),
          height: 0,
        },
        label: {
          text: `M${eq.magnitude.toFixed(1)}`,
          font: '10px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#ff3d3d'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 1e7, 0.3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1e7),
        },
        properties: {
          type: 'earthquake',
          eqId: eq.id,
        },
        show: this._visible,
      });

      this.entities.set(eq.id, entity);
    }
  }
}
