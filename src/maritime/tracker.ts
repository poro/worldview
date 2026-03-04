import { smartInterval, clearSmartInterval } from '../tick';
import * as Cesium from 'cesium';
import { fetchVessels } from './api';
import { Vessel, VesselType } from './types';
import { detectStrikeGroups } from './military';
import { TimeController } from '../time/controller';
import {
  MARITIME_UPDATE_INTERVAL,
  MARITIME_TRAIL_MAX_POINTS,
  MARITIME_TRAIL_WIDTH,
  COLORS,
} from '../config';

// Vessel type -> color mapping
const VESSEL_COLORS: Record<VesselType, string> = {
  cargo: '#808080',      // Gray
  tanker: '#4dabf7',     // Blue
  passenger: '#ffffff',   // White
  fishing: '#00e5ff',    // Cyan
  military: '#ff3d3d',   // Red
  tug: '#ffb300',        // Yellow/amber
  pleasure: '#b388ff',   // Light purple
  other: '#666666',      // Dark gray
};

// Ship icon SVG — oriented upward, arrow-like hull shape
const VESSEL_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 3L7 12L4 20L12 17L20 20L17 12L12 3Z"/></svg>`;
const VESSEL_SVG = `data:image/svg+xml;base64,${btoa(VESSEL_SVG_RAW)}`;

// Military vessel icon — pentagon/shield
const MIL_VESSEL_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 2L4 8L4 16L12 22L20 16L20 8Z"/><line x1="12" y1="2" x2="12" y2="22" stroke-width="0.8" opacity="0.4"/></svg>`;
const MIL_VESSEL_SVG = `data:image/svg+xml;base64,${btoa(MIL_VESSEL_SVG_RAW)}`;

const VESSEL_ICON_SIZE = 16;
const VESSEL_ICON_SIZE_MIL = 20;
const VESSEL_LABEL_FONT = '10px JetBrains Mono';

export class MaritimeTracker {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private trailEntities: Map<string, Cesium.Entity> = new Map();
  private vessels: Map<string, Vessel> = new Map();
  private positionHistory: Map<string, { lon: number; lat: number }[]> = new Map();
  private interval: number | null = null;
  private lastUpdate: number = 0;
  private _visible: boolean = true;
  private _selectedVessel: Vessel | null = null;
  private onSelect: ((vessel: Vessel | null) => void) | null = null;
  private onCountUpdate: ((total: number, military: number) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;
  private timeController: TimeController | null = null;
  private recorderUrl: string = '/recorder';

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  setTimeController(tc: TimeController, recorderUrl?: string) {
    this.timeController = tc;
    if (recorderUrl) this.recorderUrl = recorderUrl;
  }

  get vesselCount(): number { return this.vessels.size; }
  get militaryVesselCount(): number {
    let count = 0;
    for (const v of this.vessels.values()) {
      if (v.isMilitary) count++;
    }
    return count;
  }
  get selectedVessel(): Vessel | null { return this._selectedVessel; }
  get visible(): boolean { return this._visible; }
  get lastUpdateTime(): number { return this.lastUpdate; }

  setOnSelect(cb: (vessel: Vessel | null) => void) { this.onSelect = cb; }
  setOnCountUpdate(cb: (total: number, military: number) => void) { this.onCountUpdate = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async start() {
    await this.update();
    this.interval = smartInterval(() => this.update(), MARITIME_UPDATE_INTERVAL);
  }

  stop() {
    if (this.interval) {
      clearSmartInterval(this.interval);
      this.interval = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((entity) => { entity.show = this._visible; });
    this.trailEntities.forEach((entity) => { entity.show = this._visible; });
  }

  selectByMmsi(mmsi: string | null) {
    if (mmsi === null) {
      this._selectedVessel = null;
      this.onSelect?.(null);
      return;
    }
    const vessel = this.vessels.get(mmsi);
    if (vessel) {
      this._selectedVessel = vessel;
      this.onSelect?.(vessel);
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.mmsi) {
      const mmsi = pickedObject.id.properties.mmsi.getValue(Cesium.JulianDate.now());
      this.selectByMmsi(mmsi);
      return true;
    }
    return false;
  }

  private async fetchReplayVessels(): Promise<{ vessels: Vessel[] }> {
    if (!this.timeController) return { vessels: [] };
    const t = this.timeController.getEffectiveTime();
    const unix = Math.floor(t.getTime() / 1000);
    try {
      const res = await fetch(`${this.recorderUrl}/api/snapshots?source=maritime&time=${unix}&range=300`);
      if (!res.ok) return { vessels: [] };
      const data = await res.json();
      const rows = data.rows || data.entities || [];
      return {
        vessels: rows.map((r: Record<string, unknown>) => ({
          mmsi: String(r.mmsi || ''),
          name: String(r.name || 'Unknown'),
          lat: Number(r.lat || 0),
          lon: Number(r.lon || 0),
          heading: Number(r.heading || 0),
          course: Number(r.heading || 0),
          speed: Number(r.speed || 0),
          type: (r.ship_type || 'other') as VesselType,
          isMilitary: Boolean(r.is_military),
          flag: String(r.flag || ''),
          destination: '',
          length: 0,
          width: 0,
        })),
      };
    } catch {
      return { vessels: [] };
    }
  }

  private async update() {
    try {
      const data = (this.timeController && this.timeController.isReplay)
        ? await this.fetchReplayVessels()
        : await fetchVessels();
      if (!data.vessels || data.vessels.length === 0) return;

      this.lastUpdate = Date.now();
      const currentMmsis = new Set<string>();
      let milCount = 0;

      this.viewer.entities.suspendEvents();

      try {
        for (const vessel of data.vessels) {
          currentMmsis.add(vessel.mmsi);
          this.vessels.set(vessel.mmsi, vessel);
          if (vessel.isMilitary) milCount++;

          const color = Cesium.Color.fromCssColorString(VESSEL_COLORS[vessel.type] || VESSEL_COLORS.other);
          const heading = vessel.heading || vessel.course || 0;
          const icon = vessel.isMilitary ? MIL_VESSEL_SVG : VESSEL_SVG;
          const iconSize = vessel.isMilitary ? VESSEL_ICON_SIZE_MIL : VESSEL_ICON_SIZE;

          // Track position history for trails
          this.trackPosition(vessel.mmsi, vessel.longitude, vessel.latitude);

          if (this.entities.has(vessel.mmsi)) {
            const entity = this.entities.get(vessel.mmsi)!;
            entity.position = Cesium.Cartesian3.fromDegrees(
              vessel.longitude, vessel.latitude, 0
            ) as unknown as Cesium.PositionProperty;
            if (entity.billboard) {
              entity.billboard.rotation = new Cesium.ConstantProperty(Cesium.Math.toRadians(-heading));
              entity.billboard.color = new Cesium.ConstantProperty(color);
              entity.billboard.image = new Cesium.ConstantProperty(icon);
            }
            if (entity.label) {
              entity.label.text = new Cesium.ConstantProperty(vessel.name || vessel.mmsi);
            }
          } else {
            const entity = this.viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(vessel.longitude, vessel.latitude, 0),
              billboard: {
                image: icon,
                width: iconSize,
                height: iconSize,
                rotation: Cesium.Math.toRadians(-heading),
                color,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 1e7, 0.3),
                translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 2e7, 0.2),
              },
              label: {
                text: vessel.name || vessel.mmsi,
                font: VESSEL_LABEL_FONT,
                fillColor: vessel.isMilitary
                  ? Cesium.Color.fromCssColorString(COLORS.red)
                  : Cesium.Color.fromCssColorString('#c0c0c0'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -14),
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.0),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
              },
              properties: {
                mmsi: vessel.mmsi,
                type: 'vessel',
              },
              show: this._visible,
            });
            this.entities.set(vessel.mmsi, entity);
          }

          // Update trail
          this.updateTrail(vessel.mmsi, vessel.type);
        }

        // Remove stale entities
        for (const [mmsi, entity] of this.entities) {
          if (!currentMmsis.has(mmsi)) {
            this.viewer.entities.remove(entity);
            this.entities.delete(mmsi);
            this.vessels.delete(mmsi);
            this.positionHistory.delete(mmsi);
            const trail = this.trailEntities.get(mmsi);
            if (trail) {
              this.viewer.entities.remove(trail);
              this.trailEntities.delete(mmsi);
            }
          }
        }
      } finally {
        this.viewer.entities.resumeEvents();
      }

      this.onCountUpdate?.(this.vessels.size, milCount);

      // Detect strike groups
      const milVessels = Array.from(this.vessels.values())
        .filter(v => v.isMilitary)
        .map(v => ({ mmsi: v.mmsi, lat: v.latitude, lon: v.longitude }));
      const groups = detectStrikeGroups(milVessels);
      if (groups.length > 0) {
        console.log(`[WORLDVIEW] Maritime: ${groups.length} possible carrier strike group(s) detected`);
      }

      // Update selected vessel data
      if (this._selectedVessel) {
        const updated = this.vessels.get(this._selectedVessel.mmsi);
        if (updated) {
          this._selectedVessel = updated;
          this.onSelect?.(updated);
        }
      }
    } catch (e) {
      console.warn('Maritime update failed:', e);
      this.onError?.('MARITIME DATA FEED UNAVAILABLE');
    }
  }

  private trackPosition(mmsi: string, lon: number, lat: number) {
    let history = this.positionHistory.get(mmsi);
    if (!history) {
      history = [];
      this.positionHistory.set(mmsi, history);
    }

    // Only add if position changed
    const last = history[history.length - 1];
    if (last && Math.abs(last.lon - lon) < 0.0001 && Math.abs(last.lat - lat) < 0.0001) return;

    history.push({ lon, lat });
    if (history.length > MARITIME_TRAIL_MAX_POINTS) {
      history.shift();
    }
  }

  private updateTrail(mmsi: string, vesselType: VesselType) {
    const history = this.positionHistory.get(mmsi);
    if (!history || history.length < 2) return;

    const positions = history.map(p =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0)
    );

    const trailColor = Cesium.Color.fromCssColorString(
      VESSEL_COLORS[vesselType] || VESSEL_COLORS.other
    ).withAlpha(0.3);

    if (this.trailEntities.has(mmsi)) {
      const trail = this.trailEntities.get(mmsi)!;
      if (trail.polyline) {
        trail.polyline.positions = new Cesium.ConstantProperty(positions);
      }
    } else {
      const trail = this.viewer.entities.add({
        polyline: {
          positions,
          width: MARITIME_TRAIL_WIDTH,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.1,
            color: trailColor,
          }),
          clampToGround: true,
        },
        properties: { type: 'vessel-trail', mmsi },
        show: this._visible,
      });
      this.trailEntities.set(mmsi, trail);
    }
  }
}
