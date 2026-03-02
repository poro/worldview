import * as Cesium from 'cesium';
import {
  STRIKE_PULSE_PERIOD,
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

  /** Generate hexagon vertices around a center point */
  private hexagonPositions(lon: number, lat: number, radiusKm: number): Cesium.Cartesian3[] {
    const positions: Cesium.Cartesian3[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const dLat = (radiusKm / 111.32) * Math.cos(angle);
      const dLon = (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      positions.push(Cesium.Cartesian3.fromDegrees(lon + dLon, lat + dLat));
    }
    return positions;
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

        // Pulsing outline alpha (only color pulsing — safe)
        const pulsingOutlineColor = new Cesium.CallbackProperty(() => {
          const t = Date.now() % STRIKE_PULSE_PERIOD;
          const phase = Math.sin((t / STRIKE_PULSE_PERIOD) * Math.PI * 2);
          const a = 0.4 + 0.5 * (0.5 + phase * 0.5);
          return color.withAlpha(a);
        }, false);

        const typeLabel = strike.strike_type.toUpperCase();

        // Scale hexagon size by blast radius
        const hexRadiusKm = Math.max(5, (strike.blast_radius_m || 500) * this._blastRadiusScale / 1000 * 8);
        const hexPositions = this.hexagonPositions(strike.lon, strike.lat, hexRadiusKm);

        // Extruded height based on blast radius
        const extrudedHeight = Math.max(10000, (strike.blast_radius_m || 500) * 25);

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(strike.lon, strike.lat, 0),
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(hexPositions),
            material: color.withAlpha(0.7),
            extrudedHeight: extrudedHeight,
            height: 0,
            outline: true,
            outlineColor: pulsingOutlineColor as unknown as Cesium.Property,
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

        // Blast radius concentric hex rings
        const blastRings: Cesium.Entity[] = [];
        for (let i = 1; i <= STRIKE_BLAST_RING_COUNT; i++) {
          const ringRadiusKm = Math.max(0.1, (strike.blast_radius_m || 500) * this._blastRadiusScale * (i / STRIKE_BLAST_RING_COUNT) / 1000 * 3);
          const ringAlpha = STRIKE_BLAST_RING_ALPHA * (STRIKE_BLAST_RING_COUNT - i + 1);
          const ringPositions = this.hexagonPositions(strike.lon, strike.lat, ringRadiusKm);
          const ring = this.viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(ringPositions),
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
