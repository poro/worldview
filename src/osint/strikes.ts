import * as Cesium from 'cesium';
import {
  STRIKE_PULSE_PERIOD,
  STRIKE_PULSE_MIN_SCALE,
  STRIKE_PULSE_MAX_SCALE,
  STRIKE_ELLIPSE_BASE,
  STRIKE_LABEL_FONT,
  STRIKE_BLAST_RING_COUNT,
  STRIKE_BLAST_RING_ALPHA,
  COLORS,
} from '../config';
import { STRIKES, StrikeRecord } from '../data/strikes';

export class StrikeLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private blastEntities: Map<string, Cesium.Entity[]> = new Map();
  private strikes: StrikeRecord[] = [];
  private _visible: boolean = true;
  private _blastRadiusScale: number = 1.0;
  private onSelect: ((strike: StrikeRecord | null) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }
  get strikeCount(): number { return this.strikes.length; }
  get data(): StrikeRecord[] { return this.strikes; }
  get blastRadiusScale(): number { return this._blastRadiusScale; }

  setOnSelect(cb: (strike: StrikeRecord | null) => void) { this.onSelect = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  setBlastRadiusScale(scale: number) {
    this._blastRadiusScale = Math.max(0.1, Math.min(5.0, scale));
  }

  async load() {
    try {
      this.strikes = STRIKES;
      this.render();
    } catch (e) {
      console.warn('Strike data load failed:', e);
      this.onError?.('STRIKE DATA UNAVAILABLE');
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
    this.blastEntities.forEach((arr) => arr.forEach((e) => (e.show = this._visible)));
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'strike') {
        const strikeId = pickedObject.id.properties.strikeId.getValue(Cesium.JulianDate.now());
        const strike = this.strikes.find((s) => s.id === strikeId);
        this.onSelect?.(strike || null);
        return true;
      }
    }
    return false;
  }

  /** Show only strikes that occurred at or before the given ISO timestamp */
  setReplayTime(isoTime: string | null) {
    if (!isoTime) {
      // Show all
      this.entities.forEach((e) => (e.show = this._visible));
      this.blastEntities.forEach((arr) => arr.forEach((e) => (e.show = this._visible)));
      return;
    }
    const cutoff = new Date(isoTime).getTime();
    for (const strike of this.strikes) {
      const t = new Date(strike.time).getTime();
      const show = this._visible && t <= cutoff;
      const entity = this.entities.get(strike.id);
      if (entity) entity.show = show;
      const blasts = this.blastEntities.get(strike.id);
      if (blasts) blasts.forEach((e) => (e.show = show));
    }
  }

  private render() {
    this.viewer.entities.suspendEvents();
    try {
      for (const strike of this.strikes) {
        const color = strike.strike_type === 'air'
          ? Cesium.Color.fromCssColorString(COLORS.strikeAir)
          : strike.strike_type === 'missile'
          ? Cesium.Color.fromCssColorString(COLORS.strikeMissile)
          : Cesium.Color.fromCssColorString(COLORS.strikeDrone);

        // Pulsing ring
        const baseRadius = STRIKE_ELLIPSE_BASE;
        const pulsingRadius = new Cesium.CallbackProperty(() => {
          const t = Date.now() % STRIKE_PULSE_PERIOD;
          const phase = Math.sin((t / STRIKE_PULSE_PERIOD) * Math.PI * 2);
          const scale = STRIKE_PULSE_MIN_SCALE + (STRIKE_PULSE_MAX_SCALE - STRIKE_PULSE_MIN_SCALE) * (0.5 + phase * 0.5);
          return baseRadius * scale;
        }, false);

        // Pulsing outline alpha
        const pulsingOutlineColor = new Cesium.CallbackProperty(() => {
          const t = Date.now() % STRIKE_PULSE_PERIOD;
          const phase = Math.sin((t / STRIKE_PULSE_PERIOD) * Math.PI * 2);
          const a = 0.2 + 0.3 * (0.5 + phase * 0.5);
          return Cesium.Color.fromCssColorString(COLORS.strikeFlash).withAlpha(a);
        }, false);

        const typeLabel = strike.strike_type.toUpperCase();

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(strike.lon, strike.lat, 0),
          point: {
            pixelSize: 12,
            color: color.withAlpha(0.9),
            outlineColor: Cesium.Color.fromCssColorString(COLORS.strikeFlash).withAlpha(0.5),
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          ellipse: {
            semiMajorAxis: pulsingRadius,
            semiMinorAxis: pulsingRadius,
            material: Cesium.Color.fromCssColorString(COLORS.strikePulse).withAlpha(0.08),
            outline: true,
            outlineColor: pulsingOutlineColor as unknown as Cesium.Property,
            height: 0,
          },
          label: {
            text: `${typeLabel} \u2022 ${strike.target_name.split(' ').slice(0, 2).join(' ')}`,
            font: STRIKE_LABEL_FONT,
            fillColor: Cesium.Color.fromCssColorString(COLORS.strikeLabel),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 1e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
          },
          properties: {
            type: 'strike',
            strikeId: strike.id,
          },
          show: this._visible,
        });
        this.entities.set(strike.id, entity);

        // Blast radius concentric rings
        const blastRings: Cesium.Entity[] = [];
        for (let i = 1; i <= STRIKE_BLAST_RING_COUNT; i++) {
          const ringRadius = strike.blast_radius_m * this._blastRadiusScale * (i / STRIKE_BLAST_RING_COUNT);
          const ringAlpha = STRIKE_BLAST_RING_ALPHA * (STRIKE_BLAST_RING_COUNT - i + 1);
          const ring = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(strike.lon, strike.lat, 0),
            ellipse: {
              semiMajorAxis: ringRadius,
              semiMinorAxis: ringRadius,
              material: color.withAlpha(ringAlpha),
              outline: true,
              outlineColor: color.withAlpha(ringAlpha * 2),
              height: 0,
            },
            properties: { type: 'strike-blast', strikeId: strike.id },
            show: this._visible,
          });
          blastRings.push(ring);
        }
        this.blastEntities.set(strike.id, blastRings);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }
}
