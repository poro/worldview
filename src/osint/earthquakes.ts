import * as Cesium from 'cesium';
import { EQ_ELLIPSE_SCALE, EQ_PULSE_MIN_SCALE, EQ_PULSE_MAX_SCALE, EQ_PULSE_PERIOD, EQ_LABEL_FONT, COLORS } from '../config';

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
  private onError: ((msg: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }
  get quakeCount(): number { return this.earthquakes.length; }
  get data(): Earthquake[] { return this.earthquakes; }

  setOnSelect(cb: (eq: Earthquake | null) => void) { this.onSelect = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async load() {
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson');
      if (!res.ok) throw new Error(`USGS error: ${res.status}`);
      const data = await res.json();

      this.earthquakes = data.features.map((f: { id: string; properties: { title: string; mag: number; place: string; time: number; url: string }; geometry: { coordinates: number[] } }) => ({
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
      this.onError?.('EARTHQUAKE DATA FEED UNAVAILABLE');
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
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
    this.viewer.entities.suspendEvents();
    try {
      for (const eq of this.earthquakes) {
        const size = Math.max(10, eq.magnitude * 6);
        const alpha = Math.min(1.0, eq.magnitude / 8);
        const color = eq.magnitude >= 6
          ? Cesium.Color.RED.withAlpha(alpha)
          : eq.magnitude >= 4
          ? Cesium.Color.ORANGE.withAlpha(alpha)
          : Cesium.Color.YELLOW.withAlpha(alpha);

        // Pulsing ellipse using CallbackProperty
        const baseRadius = eq.magnitude * EQ_ELLIPSE_SCALE;
        const pulsingRadius = new Cesium.CallbackProperty(() => {
          const t = Date.now() % EQ_PULSE_PERIOD;
          const phase = Math.sin((t / EQ_PULSE_PERIOD) * Math.PI * 2);
          const scale = EQ_PULSE_MIN_SCALE + (EQ_PULSE_MAX_SCALE - EQ_PULSE_MIN_SCALE) * (0.5 + phase * 0.5);
          return baseRadius * scale;
        }, false);

        // Pulsing outline alpha
        const pulsingOutlineColor = new Cesium.CallbackProperty(() => {
          const t = Date.now() % EQ_PULSE_PERIOD;
          const phase = Math.sin((t / EQ_PULSE_PERIOD) * Math.PI * 2);
          const a = 0.15 + 0.15 * phase;
          return Cesium.Color.RED.withAlpha(a);
        }, false);

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(eq.lon, eq.lat, 0),
          point: {
            pixelSize: size,
            color,
            outlineColor: Cesium.Color.fromCssColorString(COLORS.eqOutline).withAlpha(0.3),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          ellipse: {
            semiMajorAxis: pulsingRadius,
            semiMinorAxis: pulsingRadius,
            material: Cesium.Color.RED.withAlpha(0.08),
            outline: true,
            outlineColor: pulsingOutlineColor as unknown as Cesium.Property,
            height: 0,
          },
          label: {
            text: `M${eq.magnitude.toFixed(1)}`,
            font: EQ_LABEL_FONT,
            fillColor: Cesium.Color.fromCssColorString(COLORS.red),
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
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }
}
