import * as Cesium from 'cesium';
import { STRIKES } from '../data/strikes';
import { CONFLICT_EVENTS } from '../data/events';

// ~50km hex cell size — hex "radius" in degrees (approximate)
const HEX_RADIUS_DEG = 0.45; // ~50km at mid-latitudes
const HEX_HEIGHT_PER_EVENT = 30000; // meters extrusion per event count

interface HexCell {
  centerLon: number;
  centerLat: number;
  count: number;
}

/** Snap a lon/lat to the nearest hex-grid center (offset hex grid) */
function hexKey(lon: number, lat: number): string {
  const w = HEX_RADIUS_DEG * 1.732; // hex width = sqrt(3) * radius
  const h = HEX_RADIUS_DEG * 1.5;   // hex vertical step = 1.5 * radius
  const row = Math.round(lat / h);
  const offset = (row % 2 === 0) ? 0 : w / 2;
  const col = Math.round((lon - offset) / w);
  return `${col}:${row}`;
}

function hexCenter(lon: number, lat: number): [number, number] {
  const w = HEX_RADIUS_DEG * 1.732;
  const h = HEX_RADIUS_DEG * 1.5;
  const row = Math.round(lat / h);
  const offset = (row % 2 === 0) ? 0 : w / 2;
  const col = Math.round((lon - offset) / w);
  return [col * w + offset, row * h];
}

function hexVertices(cLon: number, cLat: number): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const dLat = HEX_RADIUS_DEG * Math.cos(angle);
    const dLon = HEX_RADIUS_DEG * Math.sin(angle) / Math.cos(cLat * Math.PI / 180);
    positions.push(Cesium.Cartesian3.fromDegrees(cLon + dLon, cLat + dLat));
  }
  return positions;
}

export class HexBinLayer {
  private viewer: Cesium.Viewer;
  private entities: Cesium.Entity[] = [];
  private _visible: boolean = true;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }

  load() {
    // Aggregate all event sources into hex cells
    const cells = new Map<string, HexCell>();

    // Strikes
    for (const s of STRIKES) {
      const key = hexKey(s.lon, s.lat);
      if (!cells.has(key)) {
        const [clon, clat] = hexCenter(s.lon, s.lat);
        cells.set(key, { centerLon: clon, centerLat: clat, count: 0 });
      }
      cells.get(key)!.count++;
    }

    // Conflict events (kinetic type only, to avoid double-counting)
    for (const e of CONFLICT_EVENTS) {
      if (e.type !== 'kinetic') continue;
      const key = hexKey(e.lon, e.lat);
      if (!cells.has(key)) {
        const [clon, clat] = hexCenter(e.lon, e.lat);
        cells.set(key, { centerLon: clon, centerLat: clat, count: 0 });
      }
      cells.get(key)!.count++;
    }

    // Find max for normalization
    let maxCount = 1;
    for (const cell of cells.values()) {
      if (cell.count > maxCount) maxCount = cell.count;
    }

    // Render hex bins
    this.viewer.entities.suspendEvents();
    try {
      for (const cell of cells.values()) {
        const norm = cell.count / maxCount; // 0-1
        const alpha = 0.15 + norm * 0.55;
        const color = Cesium.Color.fromCssColorString('#ff3d3d').withAlpha(alpha);
        const outlineColor = Cesium.Color.fromCssColorString('#ff3d3d').withAlpha(alpha * 1.5);
        const extrudedHeight = cell.count * HEX_HEIGHT_PER_EVENT;
        const positions = hexVertices(cell.centerLon, cell.centerLat);

        const entity = this.viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            material: color,
            extrudedHeight,
            height: 0,
            outline: true,
            outlineColor,
          },
          properties: { type: 'hex-bin', count: cell.count },
          show: this._visible,
        });
        this.entities.push(entity);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }

  toggle() {
    this._visible = !this._visible;
    for (const e of this.entities) e.show = this._visible;
  }
}
