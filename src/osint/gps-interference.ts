import * as Cesium from 'cesium';
import {
  GPS_PULSE_PERIOD,
  GPS_EDGE_PULSE_MIN_ALPHA,
  GPS_EDGE_PULSE_MAX_ALPHA,
  GPS_FILL_ALPHA,
  GPS_LABEL_FONT,
  COLORS,
} from '../config';
import { GPS_INTERFERENCE_ZONES, GpsInterferenceZone, GpsSeverity } from '../data/gps-interference';

export class GpsInterferenceLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private zones: GpsInterferenceZone[] = [];
  private _visible: boolean = true;
  private onSelect: ((zone: GpsInterferenceZone | null) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }
  get zoneCount(): number { return this.zones.length; }
  get data(): GpsInterferenceZone[] { return this.zones; }

  setOnSelect(cb: (zone: GpsInterferenceZone | null) => void) { this.onSelect = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async load() {
    try {
      this.zones = GPS_INTERFERENCE_ZONES;
      this.render();
    } catch (e) {
      console.warn('GPS interference data load failed:', e);
      this.onError?.('GPS INTERFERENCE DATA UNAVAILABLE');
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'gps-interference') {
        const zoneId = pickedObject.id.properties.zoneId.getValue(Cesium.JulianDate.now());
        const zone = this.zones.find((z) => z.id === zoneId);
        this.onSelect?.(zone || null);
        return true;
      }
    }
    return false;
  }

  private severityColor(severity: GpsSeverity): string {
    switch (severity) {
      case 'minor': return COLORS.gpsMinor;
      case 'moderate': return COLORS.gpsModerate;
      case 'severe': return COLORS.gpsSevere;
    }
  }

  private render() {
    this.viewer.entities.suspendEvents();
    try {
      for (const zone of this.zones) {
        const baseColor = Cesium.Color.fromCssColorString(this.severityColor(zone.severity));
        const radiusMeters = zone.radius_km * 1000;

        // Pulsing edge effect
        const pulsingOutline = new Cesium.CallbackProperty(() => {
          const t = Date.now() % GPS_PULSE_PERIOD;
          const phase = Math.sin((t / GPS_PULSE_PERIOD) * Math.PI * 2);
          const a = GPS_EDGE_PULSE_MIN_ALPHA + (GPS_EDGE_PULSE_MAX_ALPHA - GPS_EDGE_PULSE_MIN_ALPHA) * (0.5 + phase * 0.5);
          return baseColor.withAlpha(a);
        }, false);

        // Pulsing radius for active-zone feel
        const pulsingRadius = new Cesium.CallbackProperty(() => {
          const t = Date.now() % GPS_PULSE_PERIOD;
          const phase = Math.sin((t / GPS_PULSE_PERIOD) * Math.PI * 2);
          const scale = 0.98 + 0.02 * phase;
          return radiusMeters * scale;
        }, false);

        const typeIcon = zone.type === 'jamming' ? 'JAM' : zone.type === 'spoofing' ? 'SPOOF' : 'JAM+SPOOF';
        const sevLabel = zone.severity.toUpperCase();

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 0),
          ellipse: {
            semiMajorAxis: pulsingRadius,
            semiMinorAxis: pulsingRadius,
            material: baseColor.withAlpha(GPS_FILL_ALPHA),
            outline: true,
            outlineColor: pulsingOutline as unknown as Cesium.Property,
            outlineWidth: 2,
            height: 0,
          },
          label: {
            text: `GPS ${typeIcon} \u2022 ${sevLabel}\n${zone.name}`,
            font: GPS_LABEL_FONT,
            fillColor: baseColor.withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 0),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 2e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.5e7),
          },
          properties: {
            type: 'gps-interference',
            zoneId: zone.id,
          },
          show: this._visible,
        });
        this.entities.set(zone.id, entity);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }
}
