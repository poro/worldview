import * as Cesium from 'cesium';
import {
  SHIPPING_LANE_WIDTH,
  SHIPPING_DASH_LENGTH,
  SHIPPING_DASH_PATTERN,
  SHIPPING_LABEL_FONT,
  CHOKEPOINT_ICON_SIZE,
  COLORS,
} from '../config';
import { SHIPPING_LANES, CHOKEPOINTS, ShippingLane, Chokepoint, LaneStatus } from '../data/shipping';

export class ShippingLayer {
  private viewer: Cesium.Viewer;
  private laneEntities: Map<string, Cesium.Entity> = new Map();
  private chokepointEntities: Map<string, Cesium.Entity> = new Map();
  private lanes: ShippingLane[] = [];
  private chokepoints: Chokepoint[] = [];
  private _visible: boolean = true;
  private onSelectLane: ((lane: ShippingLane | null) => void) | null = null;
  private onSelectChokepoint: ((cp: Chokepoint | null) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }
  get laneCount(): number { return this.lanes.length; }
  get chokepointCount(): number { return this.chokepoints.length; }
  get laneData(): ShippingLane[] { return this.lanes; }
  get chokepointData(): Chokepoint[] { return this.chokepoints; }

  setOnSelectLane(cb: (lane: ShippingLane | null) => void) { this.onSelectLane = cb; }
  setOnSelectChokepoint(cb: (cp: Chokepoint | null) => void) { this.onSelectChokepoint = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async load() {
    try {
      this.lanes = SHIPPING_LANES;
      this.chokepoints = CHOKEPOINTS;
      this.render();
    } catch (e) {
      console.warn('Shipping data load failed:', e);
      this.onError?.('SHIPPING DATA UNAVAILABLE');
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.laneEntities.forEach((e) => (e.show = this._visible));
    this.chokepointEntities.forEach((e) => (e.show = this._visible));
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'shipping-lane') {
        const laneId = pickedObject.id.properties.laneId.getValue(Cesium.JulianDate.now());
        const lane = this.lanes.find((l) => l.id === laneId);
        this.onSelectLane?.(lane || null);
        return true;
      }
      if (type === 'chokepoint') {
        const cpId = pickedObject.id.properties.cpId.getValue(Cesium.JulianDate.now());
        const cp = this.chokepoints.find((c) => c.id === cpId);
        this.onSelectChokepoint?.(cp || null);
        return true;
      }
    }
    return false;
  }

  private statusColor(status: LaneStatus): Cesium.Color {
    switch (status) {
      case 'open': return Cesium.Color.fromCssColorString(COLORS.laneOpen);
      case 'delayed': return Cesium.Color.fromCssColorString(COLORS.laneDelayed);
      case 'blocked': return Cesium.Color.fromCssColorString(COLORS.laneBlocked);
    }
  }

  private statusLabel(status: LaneStatus): string {
    switch (status) {
      case 'open': return 'OPEN';
      case 'delayed': return 'DELAYED';
      case 'blocked': return 'BLOCKED';
    }
  }

  private render() {
    this.viewer.entities.suspendEvents();
    try {
      // Render shipping lanes as polylines
      for (const lane of this.lanes) {
        const color = this.statusColor(lane.status);
        const positions = lane.waypoints.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat));

        // Midpoint for label
        const midIdx = Math.floor(lane.waypoints.length / 2);
        const [midLon, midLat] = lane.waypoints[midIdx];

        const entity = this.viewer.entities.add({
          polyline: {
            positions,
            width: SHIPPING_LANE_WIDTH,
            material: new Cesium.PolylineDashMaterialProperty({
              color: color.withAlpha(0.7),
              gapColor: Cesium.Color.TRANSPARENT,
              dashLength: SHIPPING_DASH_LENGTH,
              dashPattern: SHIPPING_DASH_PATTERN,
            }),
            clampToGround: true,
          },
          position: Cesium.Cartesian3.fromDegrees(midLon, midLat, 0),
          label: {
            text: `${lane.name.split(' \u2014 ')[0]}\n${this.statusLabel(lane.status)} \u2022 ${lane.daily_vessel_count} vessels/day`,
            font: SHIPPING_LABEL_FONT,
            fillColor: color.withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8e6),
          },
          properties: {
            type: 'shipping-lane',
            laneId: lane.id,
          },
          show: this._visible,
        });
        this.laneEntities.set(lane.id, entity);
      }

      // Render chokepoints
      for (const cp of this.chokepoints) {
        const color = this.statusColor(cp.status);

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(cp.lon, cp.lat, 0),
          point: {
            pixelSize: CHOKEPOINT_ICON_SIZE,
            color: Cesium.Color.fromCssColorString(COLORS.chokepoint).withAlpha(0.8),
            outlineColor: color.withAlpha(0.6),
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: `\u2693 ${cp.name}\n${this.statusLabel(cp.status)} \u2022 ${cp.oil_throughput_mbpd > 0 ? cp.oil_throughput_mbpd + ' MBPD' : 'HALTED'}`,
            font: SHIPPING_LABEL_FONT,
            fillColor: Cesium.Color.fromCssColorString(COLORS.chokepoint),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -22),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1e7, 0.35),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1e7),
          },
          properties: {
            type: 'chokepoint',
            cpId: cp.id,
          },
          show: this._visible,
        });
        this.chokepointEntities.set(cp.id, entity);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }
}
