import * as Cesium from 'cesium';
import {
  AIRSPACE_FILL_ALPHA,
  AIRSPACE_OUTLINE_ALPHA,
  AIRSPACE_OUTLINE_WIDTH,
  COLORS,
} from '../config';
import { AIRSPACE_ZONES, AirspaceZone, AirspaceStatus } from '../data/airspace';

export class AirspaceLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private zones: AirspaceZone[] = [];
  private _visible: boolean = true;
  private onSelect: ((zone: AirspaceZone | null) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }
  get zoneCount(): number { return this.zones.length; }
  get data(): AirspaceZone[] { return this.zones; }

  setOnSelect(cb: (zone: AirspaceZone | null) => void) { this.onSelect = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async load() {
    try {
      this.zones = AIRSPACE_ZONES;
      this.render();
    } catch (e) {
      console.warn('Airspace data load failed:', e);
      this.onError?.('AIRSPACE DATA UNAVAILABLE');
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'airspace') {
        const zoneId = pickedObject.id.properties.zoneId.getValue(Cesium.JulianDate.now());
        const zone = this.zones.find((z) => z.id === zoneId);
        this.onSelect?.(zone || null);
        return true;
      }
    }
    return false;
  }

  private statusColor(status: AirspaceStatus): string {
    switch (status) {
      case 'closed': return COLORS.airspaceClosed;
      case 'restricted': return COLORS.airspaceRestricted;
      case 'partial': return COLORS.airspacePartial;
    }
  }

  private statusLabel(status: AirspaceStatus): string {
    switch (status) {
      case 'closed': return 'CLOSED';
      case 'restricted': return 'RESTRICTED';
      case 'partial': return 'PARTIAL';
    }
  }

  /** Compute polygon centroid for label placement */
  private centroid(boundary: [number, number][]): [number, number] {
    let lonSum = 0;
    let latSum = 0;
    // Exclude last point if it duplicates the first (closed polygon)
    const pts = boundary.length > 1 &&
      boundary[0][0] === boundary[boundary.length - 1][0] &&
      boundary[0][1] === boundary[boundary.length - 1][1]
      ? boundary.slice(0, -1)
      : boundary;
    for (const [lon, lat] of pts) {
      lonSum += lon;
      latSum += lat;
    }
    return [lonSum / pts.length, latSum / pts.length];
  }

  private render() {
    this.viewer.entities.suspendEvents();
    try {
      for (const zone of this.zones) {
        const baseColor = Cesium.Color.fromCssColorString(this.statusColor(zone.status));
        const positions = zone.boundary.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat));

        const [cLon, cLat] = this.centroid(zone.boundary);
        const startStr = new Date(zone.start_time).toUTCString().slice(0, 22) + ' UTC';

        // Polygon entity
        const entity = this.viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            material: baseColor.withAlpha(AIRSPACE_FILL_ALPHA),
            outline: true,
            outlineColor: baseColor.withAlpha(AIRSPACE_OUTLINE_ALPHA),
            outlineWidth: AIRSPACE_OUTLINE_WIDTH,
            height: 0,
          },
          position: Cesium.Cartesian3.fromDegrees(cLon, cLat, 0),
          label: {
            text: `${zone.country} AIRSPACE ${this.statusLabel(zone.status)}\n${zone.notam_id}\nFrom: ${startStr}`,
            font: 'bold 13px JetBrains Mono',
            fillColor: baseColor.withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            backgroundColor: Cesium.Color.fromCssColorString('#0a0a0f').withAlpha(0.6),
            showBackground: true,
            backgroundPadding: new Cesium.Cartesian2(8, 5),
            pixelOffset: new Cesium.Cartesian2(0, 0),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 1.5e7, 0.3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.2e7),
          },
          properties: {
            type: 'airspace',
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
