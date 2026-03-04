import { smartInterval, clearSmartInterval } from '../tick';
import * as Cesium from 'cesium';
import { TLERecord, fetchTLEs } from './tle';
import { propagateSatellite, computeOrbitPath, SatellitePosition } from './propagator';
import { TimeController } from '../time/controller';
import {
  SAT_MAX_PER_CATEGORY,
  SAT_ORBIT_STEPS,
  SAT_ORBIT_LINE_WIDTH,
  SAT_ORBIT_GLOW_POWER,
  SAT_GROUND_TRACK_DASH_LENGTH,
  SAT_LABEL_FONT,
  SATELLITE_POSITION_UPDATE_INTERVAL,
  COLORS,
} from '../config';

const CATEGORY_COLORS: Record<string, string> = {
  stations: COLORS.satStations,
  starlink: COLORS.satStarlink,
  military: COLORS.satMilitary,
  weather: COLORS.satWeather,
  gps: COLORS.satGps,
};

export class SatelliteRenderer {
  private viewer: Cesium.Viewer;
  private tles: Map<string, TLERecord[]> = new Map();
  private entities: Map<string, Cesium.Entity> = new Map();
  private orbitEntities: Map<string, Cesium.Entity> = new Map();
  private footprintEntities: Map<string, Cesium.Entity> = new Map();
  private animInterval: number | null = null;
  private _visible: boolean = false;
  private _activeCategories: Set<string> = new Set(['stations', 'starlink', 'military', 'gps', 'weather']);
  private _selectedSat: SatellitePosition | null = null;
  private _selectedTle: TLERecord | null = null;
  private onSelect: ((sat: SatellitePosition | null) => void) | null = null;
  private onCountUpdate: ((count: number) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;
  private timeController: TimeController | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  setTimeController(tc: TimeController) { this.timeController = tc; }

  private getEffectiveTime(): Date {
    return this.timeController ? this.timeController.getEffectiveTime() : new Date();
  }

  get visible(): boolean { return this._visible; }
  get satCount(): number { return this.entities.size; }
  get activeCategories(): Set<string> { return this._activeCategories; }
  get selectedSat(): SatellitePosition | null { return this._selectedSat; }

  setOnSelect(cb: (sat: SatellitePosition | null) => void) { this.onSelect = cb; }
  setOnCountUpdate(cb: (count: number) => void) { this.onCountUpdate = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async loadCategory(category: string) {
    try {
      const records = await fetchTLEs(category);
      const limited = records.slice(0, SAT_MAX_PER_CATEGORY[category] || 100);
      this.tles.set(category, limited);
      this.renderCategory(category);
    } catch (e) {
      console.warn(`Failed to load ${category} TLEs:`, e);
      this.onError?.(`SATELLITE ${category.toUpperCase()} TLE LOAD FAILED`);
    }
  }

  async start() {
    const categories = Array.from(this._activeCategories);
    await Promise.allSettled(categories.map((c) => this.loadCategory(c)));
    this.animInterval = smartInterval(() => this.updatePositions(), SATELLITE_POSITION_UPDATE_INTERVAL);
  }

  stop() {
    if (this.animInterval) {
      clearSmartInterval(this.animInterval);
      this.animInterval = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
    this.orbitEntities.forEach((e) => (e.show = this._visible));
    this.footprintEntities.forEach((e) => (e.show = this._visible));
  }

  toggleCategory(category: string) {
    if (this._activeCategories.has(category)) {
      this._activeCategories.delete(category);
      this.removeCategoryEntities(category);
    } else {
      this._activeCategories.add(category);
      if (this.tles.has(category)) {
        this.renderCategory(category);
      } else {
        this.loadCategory(category);
      }
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'satellite') {
        const noradId = pickedObject.id.properties.noradId.getValue(Cesium.JulianDate.now());
        this.selectByNoradId(noradId);
        return true;
      }
    }
    return false;
  }

  selectByNoradId(noradId: string | null) {
    this.clearOrbitDisplay();

    if (!noradId) {
      this._selectedSat = null;
      this._selectedTle = null;
      this.onSelect?.(null);
      return;
    }

    for (const [, records] of this.tles) {
      for (const tle of records) {
        const id = tle.line1.substring(2, 7).trim();
        if (id === noradId) {
          const pos = propagateSatellite(tle, this.getEffectiveTime());
          if (pos) {
            this._selectedSat = pos;
            this._selectedTle = tle;
            this.onSelect?.(pos);
            this.showOrbit(tle);
          }
          return;
        }
      }
    }
  }

  private showOrbit(tle: TLERecord) {
    const path = computeOrbitPath(tle, this.getEffectiveTime(), SAT_ORBIT_STEPS);
    if (path.length < 2) return;

    const color = Cesium.Color.fromCssColorString(CATEGORY_COLORS[tle.category] || '#ffffff').withAlpha(0.4);
    const positions = path.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt * 1000)
    );

    const entity = this.viewer.entities.add({
      polyline: {
        positions,
        width: SAT_ORBIT_LINE_WIDTH,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: SAT_ORBIT_GLOW_POWER,
          color,
        }),
      },
      properties: { type: 'orbit-line' },
    });
    this.orbitEntities.set('selected-orbit', entity);

    const groundPositions = path.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0)
    );
    const groundEntity = this.viewer.entities.add({
      polyline: {
        positions: groundPositions,
        width: 1,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(0.2),
          dashLength: SAT_GROUND_TRACK_DASH_LENGTH,
        }),
        clampToGround: true,
      },
      properties: { type: 'orbit-ground' },
    });
    this.orbitEntities.set('selected-ground', groundEntity);
  }

  private clearOrbitDisplay() {
    for (const [, entity] of this.orbitEntities) {
      this.viewer.entities.remove(entity);
    }
    this.orbitEntities.clear();
  }

  private renderCategory(category: string) {
    const records = this.tles.get(category);
    if (!records) return;

    const now = this.getEffectiveTime();
    const colorStr = CATEGORY_COLORS[category] || '#ffffff';
    const color = Cesium.Color.fromCssColorString(colorStr);

    this.viewer.entities.suspendEvents();
    try {
      for (const tle of records) {
        const pos = propagateSatellite(tle, now);
        if (!pos) continue;

        const key = `${category}-${pos.noradId}`;
        if (this.entities.has(key)) continue;

        const isStation = category === 'stations' && tle.name.includes('ISS');
        const pointSize = isStation ? 8 : category === 'starlink' ? 3 : 5;

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000),
          point: {
            pixelSize: pointSize,
            color: isStation ? Cesium.Color.RED : color,
            outlineColor: Cesium.Color.fromCssColorString('#000000').withAlpha(0.5),
            outlineWidth: 1,
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e8, 0.5),
          },
          label: category !== 'starlink' ? {
            text: tle.name.substring(0, 20),
            font: SAT_LABEL_FONT,
            fillColor: color.withAlpha(0.8),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 5e7, 0.0),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1e7),
          } : undefined,
          properties: {
            type: 'satellite',
            noradId: pos.noradId,
            category,
          },
          show: this._visible,
        });

        this.entities.set(key, entity);

        // Add footprint fan lines for military/weather/ISR satellites
        if (category === 'military' || category === 'weather' || (category === 'stations' && tle.name.includes('ISS'))) {
          this.createFootprintFan(key, pos, category);
        }
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }

    this.onCountUpdate?.(this.entities.size);
  }

  /** Create fan of footprint lines from satellite to ground swath corners */
  private createFootprintFan(key: string, pos: SatellitePosition, category: string) {
    const fpBaseKey = `fp-${key}`;
    if (this.footprintEntities.has(`${fpBaseKey}-0`)) return; // already created

    const altM = pos.alt * 1000;
    // Swath half-angle in degrees — approximate imaging swath from altitude
    const swathDeg = Math.min(3.0, altM / 200000);
    const lineColor = Cesium.Color.fromCssColorString('#00e5ff').withAlpha(0.12);
    const fanAngles = [-2, -1, 0, 1, 2]; // 5 fan lines

    for (let i = 0; i < fanAngles.length; i++) {
      const offsetDeg = fanAngles[i] * swathDeg * 0.5;
      const groundLon = pos.lon + offsetDeg / Math.cos(pos.lat * Math.PI / 180);
      const groundLat = pos.lat + offsetDeg * 0.3; // slight lat offset too

      const fpEntity = this.viewer.entities.add({
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, altM),
            Cesium.Cartesian3.fromDegrees(groundLon, groundLat, 0),
          ],
          width: 1,
          material: lineColor,
        },
        properties: { type: 'sat-footprint', noradId: pos.noradId, fanIndex: i },
        show: this._visible,
      });
      this.footprintEntities.set(`${fpBaseKey}-${i}`, fpEntity);
    }

    // Add a name label for military sats above the globe
    if (category === 'military') {
      const entity = this.entities.get(key);
      if (entity && !entity.label) {
        // Label already handled in renderCategory for non-starlink
      }
    }
  }

  private removeCategoryEntities(category: string) {
    const keysToRemove: string[] = [];
    this.viewer.entities.suspendEvents();
    try {
      for (const [key, entity] of this.entities) {
        if (key.startsWith(category + '-')) {
          this.viewer.entities.remove(entity);
          keysToRemove.push(key);
        }
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
    keysToRemove.forEach((k) => {
      this.entities.delete(k);
      // Remove all fan lines (0-4) for this entity
      for (let i = 0; i < 5; i++) {
        const fpKey = `fp-${k}-${i}`;
        const fpEntity = this.footprintEntities.get(fpKey);
        if (fpEntity) {
          this.viewer.entities.remove(fpEntity);
          this.footprintEntities.delete(fpKey);
        }
      }
    });
    this.onCountUpdate?.(this.entities.size);
  }

  private updatePositions() {
    const now = this.getEffectiveTime();
    for (const [category, records] of this.tles) {
      if (!this._activeCategories.has(category)) continue;
      for (const tle of records) {
        const pos = propagateSatellite(tle, now);
        if (!pos) continue;
        const key = `${category}-${pos.noradId}`;
        const entity = this.entities.get(key);
        if (entity) {
          entity.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000) as unknown as Cesium.PositionProperty;
        }
        // Update footprint fan line positions
        const fpBaseKey = `fp-${key}`;
        const altM = pos.alt * 1000;
        const swathDeg = Math.min(3.0, altM / 200000);
        const fanAngles = [-2, -1, 0, 1, 2];
        for (let i = 0; i < fanAngles.length; i++) {
          const fpEntity = this.footprintEntities.get(`${fpBaseKey}-${i}`);
          if (fpEntity?.polyline) {
            const offsetDeg = fanAngles[i] * swathDeg * 0.5;
            const groundLon = pos.lon + offsetDeg / Math.cos(pos.lat * Math.PI / 180);
            const groundLat = pos.lat + offsetDeg * 0.3;
            fpEntity.polyline.positions = new Cesium.ConstantProperty([
              Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, altM),
              Cesium.Cartesian3.fromDegrees(groundLon, groundLat, 0),
            ]);
          }
        }
      }
    }

    if (this._selectedTle) {
      const pos = propagateSatellite(this._selectedTle, now);
      if (pos) {
        this._selectedSat = pos;
        this.onSelect?.(pos);
      }
    }
  }
}
