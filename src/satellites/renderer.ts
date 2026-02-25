import * as Cesium from 'cesium';
import { TLERecord, fetchTLEs } from './tle';
import { propagateSatellite, computeOrbitPath, SatellitePosition } from './propagator';

const CATEGORY_COLORS: Record<string, string> = {
  stations: '#ff3d3d',
  starlink: '#4dabf7',
  military: '#ffb300',
  weather: '#00e5ff',
  gps: '#00ff88',
};

const CATEGORY_LABELS: Record<string, string> = {
  stations: 'STATIONS',
  starlink: 'STARLINK',
  military: 'MILITARY',
  weather: 'WEATHER',
  gps: 'GPS',
};

export class SatelliteRenderer {
  private viewer: Cesium.Viewer;
  private tles: Map<string, TLERecord[]> = new Map();
  private entities: Map<string, Cesium.Entity> = new Map();
  private orbitEntities: Map<string, Cesium.Entity> = new Map();
  private animInterval: ReturnType<typeof setInterval> | null = null;
  private _visible: boolean = true;
  private _activeCategories: Set<string> = new Set(['stations', 'starlink', 'military', 'gps', 'weather']);
  private _selectedSat: SatellitePosition | null = null;
  private _selectedTle: TLERecord | null = null;
  private onSelect: ((sat: SatellitePosition | null) => void) | null = null;
  private onCountUpdate: ((count: number) => void) | null = null;
  private maxPerCategory: Record<string, number> = {
    stations: 100,
    starlink: 2000,
    military: 300,
    weather: 100,
    gps: 50,
  };

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean {
    return this._visible;
  }

  get satCount(): number {
    return this.entities.size;
  }

  get activeCategories(): Set<string> {
    return this._activeCategories;
  }

  get selectedSat(): SatellitePosition | null {
    return this._selectedSat;
  }

  setOnSelect(cb: (sat: SatellitePosition | null) => void) {
    this.onSelect = cb;
  }

  setOnCountUpdate(cb: (count: number) => void) {
    this.onCountUpdate = cb;
  }

  async loadCategory(category: string) {
    try {
      const records = await fetchTLEs(category);
      const limited = records.slice(0, this.maxPerCategory[category] || 100);
      this.tles.set(category, limited);
      this.renderCategory(category);
    } catch (e) {
      console.warn(`Failed to load ${category} TLEs:`, e);
    }
  }

  async start() {
    const categories = Array.from(this._activeCategories);
    await Promise.allSettled(categories.map((c) => this.loadCategory(c)));
    this.animInterval = setInterval(() => this.updatePositions(), 2000);
  }

  stop() {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
    this.orbitEntities.forEach((e) => (e.show = this._visible));
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

  handlePick(pickedObject: any): boolean {
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
    // Clear previous orbit
    this.clearOrbitDisplay();

    if (!noradId) {
      this._selectedSat = null;
      this._selectedTle = null;
      this.onSelect?.(null);
      return;
    }

    // Find TLE
    for (const [, records] of this.tles) {
      for (const tle of records) {
        const id = tle.line1.substring(2, 7).trim();
        if (id === noradId) {
          const pos = propagateSatellite(tle, new Date());
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
    const path = computeOrbitPath(tle, new Date(), 180);
    if (path.length < 2) return;

    const color = Cesium.Color.fromCssColorString(CATEGORY_COLORS[tle.category] || '#ffffff').withAlpha(0.4);
    const positions = path.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt * 1000)
    );

    const entity = this.viewer.entities.add({
      polyline: {
        positions,
        width: 1.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color,
        }),
      },
      properties: { type: 'orbit-line' },
    });
    this.orbitEntities.set('selected-orbit', entity);

    // Ground track
    const groundPositions = path.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0)
    );
    const groundEntity = this.viewer.entities.add({
      polyline: {
        positions: groundPositions,
        width: 1,
        material: new Cesium.PolylineDashMaterialProperty({
          color: color.withAlpha(0.2),
          dashLength: 16,
        }),
        clampToGround: true,
      },
      properties: { type: 'orbit-ground' },
    });
    this.orbitEntities.set('selected-ground', groundEntity);
  }

  private clearOrbitDisplay() {
    for (const [key, entity] of this.orbitEntities) {
      this.viewer.entities.remove(entity);
    }
    this.orbitEntities.clear();
  }

  private renderCategory(category: string) {
    const records = this.tles.get(category);
    if (!records) return;

    const now = new Date();
    const colorStr = CATEGORY_COLORS[category] || '#ffffff';
    const color = Cesium.Color.fromCssColorString(colorStr);

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
          font: '10px JetBrains Mono',
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
    }

    this.onCountUpdate?.(this.entities.size);
  }

  private removeCategoryEntities(category: string) {
    const keysToRemove: string[] = [];
    for (const [key, entity] of this.entities) {
      if (key.startsWith(category + '-')) {
        this.viewer.entities.remove(entity);
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => this.entities.delete(k));
    this.onCountUpdate?.(this.entities.size);
  }

  private updatePositions() {
    const now = new Date();
    for (const [category, records] of this.tles) {
      if (!this._activeCategories.has(category)) continue;
      for (const tle of records) {
        const pos = propagateSatellite(tle, now);
        if (!pos) continue;
        const key = `${category}-${pos.noradId}`;
        const entity = this.entities.get(key);
        if (entity) {
          entity.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000) as any;
        }
      }
    }

    // Update selected
    if (this._selectedTle) {
      const pos = propagateSatellite(this._selectedTle, now);
      if (pos) {
        this._selectedSat = pos;
        this.onSelect?.(pos);
      }
    }
  }
}
