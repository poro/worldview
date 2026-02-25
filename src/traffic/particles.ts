import * as Cesium from 'cesium';

interface RoadSegment {
  points: { lon: number; lat: number }[];
  type: 'motorway' | 'trunk' | 'primary' | 'secondary';
  length: number; // approximate meters
}

interface Particle {
  segmentIndex: number;
  progress: number; // 0..1 along segment
  speed: number; // progress per second
  pointIndex: number; // index in PointPrimitiveCollection
}

const ROAD_COLORS: Record<string, Cesium.Color> = {
  motorway: Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.9),
  trunk: Cesium.Color.fromCssColorString('#ddddff').withAlpha(0.8),
  primary: Cesium.Color.fromCssColorString('#aaaacc').withAlpha(0.7),
  secondary: Cesium.Color.fromCssColorString('#8888aa').withAlpha(0.5),
};

const ROAD_PIXEL_SIZES: Record<string, number> = {
  motorway: 4,
  trunk: 3.5,
  primary: 3,
  secondary: 2.5,
};

// Speed in m/s by road type
const ROAD_SPEEDS: Record<string, number> = {
  motorway: 30,
  trunk: 22,
  primary: 14,
  secondary: 9,
};

const MAX_PARTICLES = 2500;
const ALTITUDE_THRESHOLD = 10000; // meters — only show below 10km
const CACHE_MARGIN = 0.3; // 30% margin before refetching
const FETCH_COOLDOWN = 5000; // ms between API calls
const ROAD_TYPES_ORDERED = ['motorway', 'trunk', 'primary', 'secondary'] as const;

export class TrafficParticles {
  private viewer: Cesium.Viewer;
  private pointCollection: Cesium.PointPrimitiveCollection;
  private roads: RoadSegment[] = [];
  private particles: Particle[] = [];
  private _visible: boolean = true;
  private _active: boolean = false;
  private animFrameId: number | null = null;
  private lastFetchTime: number = 0;
  private cachedBbox: { south: number; west: number; north: number; east: number } | null = null;
  private fetchingRoads: boolean = false;
  private lastFrameTime: number = 0;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.pointCollection = new Cesium.PointPrimitiveCollection();
    this.viewer.scene.primitives.add(this.pointCollection);
  }

  get visible(): boolean {
    return this._visible;
  }

  start() {
    this._active = true;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stop() {
    this._active = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clearParticles();
  }

  toggle() {
    this._visible = !this._visible;
    if (!this._visible) {
      this.clearParticles();
    }
  }

  private tick = () => {
    if (!this._active) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1); // cap delta
    this.lastFrameTime = now;

    if (this._visible) {
      const camAlt = this.viewer.camera.positionCartographic.height;

      if (camAlt < ALTITUDE_THRESHOLD) {
        this.checkAndFetchRoads();
        this.updateParticles(dt);
      } else {
        // Too high — clear particles
        if (this.particles.length > 0) {
          this.clearParticles();
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private checkAndFetchRoads() {
    if (this.fetchingRoads) return;
    if (Date.now() - this.lastFetchTime < FETCH_COOLDOWN) return;

    const bbox = this.getViewportBbox();
    if (!bbox) return;

    // Check if we need to refetch
    if (this.cachedBbox && this.bboxContains(this.cachedBbox, bbox)) return;

    this.fetchRoadsSequential(bbox);
  }

  private getViewportBbox(): { south: number; west: number; north: number; east: number } | null {
    const canvas = this.viewer.scene.canvas;
    const corners = [
      new Cesium.Cartesian2(0, 0),
      new Cesium.Cartesian2(canvas.width, 0),
      new Cesium.Cartesian2(0, canvas.height),
      new Cesium.Cartesian2(canvas.width, canvas.height),
      new Cesium.Cartesian2(canvas.width / 2, canvas.height / 2),
    ];

    let south = 90, north = -90, west = 180, east = -180;
    let valid = 0;

    for (const corner of corners) {
      const ray = this.viewer.camera.getPickRay(corner);
      if (!ray) continue;
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian) continue;
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lon = Cesium.Math.toDegrees(carto.longitude);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      valid++;
    }

    if (valid < 3) return null;

    // Clamp to reasonable size (max ~0.5 degree span to avoid huge Overpass queries)
    const latSpan = north - south;
    const lonSpan = east - west;
    if (latSpan > 0.5 || lonSpan > 0.5) {
      const center = this.viewer.camera.positionCartographic;
      const cLat = Cesium.Math.toDegrees(center.latitude);
      const cLon = Cesium.Math.toDegrees(center.longitude);
      south = cLat - 0.15;
      north = cLat + 0.15;
      west = cLon - 0.15;
      east = cLon + 0.15;
    }

    return { south, west, north, east };
  }

  private bboxContains(
    outer: { south: number; west: number; north: number; east: number },
    inner: { south: number; west: number; north: number; east: number }
  ): boolean {
    const margin = CACHE_MARGIN * Math.max(outer.north - outer.south, outer.east - outer.west);
    return (
      inner.south >= outer.south + margin &&
      inner.north <= outer.north - margin &&
      inner.west >= outer.west + margin &&
      inner.east <= outer.east - margin
    );
  }

  private async fetchRoadsSequential(bbox: { south: number; west: number; north: number; east: number }) {
    this.fetchingRoads = true;
    this.lastFetchTime = Date.now();

    // Expand bbox for caching
    const expand = 0.05;
    const expandedBbox = {
      south: bbox.south - expand,
      west: bbox.west - expand,
      north: bbox.north + expand,
      east: bbox.east + expand,
    };

    const newRoads: RoadSegment[] = [];
    const bboxStr = `${expandedBbox.south.toFixed(4)},${expandedBbox.west.toFixed(4)},${expandedBbox.north.toFixed(4)},${expandedBbox.east.toFixed(4)}`;

    // Sequential loading: motorway → trunk → primary → secondary
    for (const roadType of ROAD_TYPES_ORDERED) {
      if (!this._active || !this._visible) break;

      try {
        const query = `[out:json][timeout:10];way["highway"="${roadType}"](${bboxStr});out geom;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();

        if (data.elements) {
          for (const elem of data.elements) {
            if (!elem.geometry || elem.geometry.length < 2) continue;
            const points = elem.geometry.map((g: { lat: number; lon: number }) => ({
              lon: g.lon,
              lat: g.lat,
            }));
            const length = this.estimateLength(points);
            if (length > 0) {
              newRoads.push({ points, type: roadType, length });
            }
          }
        }
      } catch {
        // Skip failed road type
      }
    }

    if (newRoads.length > 0) {
      this.roads = newRoads;
      this.cachedBbox = expandedBbox;
      this.respawnParticles();
    }

    this.fetchingRoads = false;
  }

  private estimateLength(points: { lon: number; lat: number }[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const dlat = (points[i].lat - points[i - 1].lat) * 111320;
      const dlon = (points[i].lon - points[i - 1].lon) * 111320 * Math.cos((points[i].lat * Math.PI) / 180);
      len += Math.sqrt(dlat * dlat + dlon * dlon);
    }
    return len;
  }

  private respawnParticles() {
    this.clearParticles();
    if (this.roads.length === 0) return;

    // Distribute particles proportional to road length, weighted by type
    const typeWeight: Record<string, number> = {
      motorway: 3,
      trunk: 2,
      primary: 1.5,
      secondary: 1,
    };

    let totalWeight = 0;
    for (const road of this.roads) {
      totalWeight += road.length * (typeWeight[road.type] || 1);
    }

    if (totalWeight === 0) return;

    let particleCount = 0;

    for (let i = 0; i < this.roads.length && particleCount < MAX_PARTICLES; i++) {
      const road = this.roads[i];
      const weight = road.length * (typeWeight[road.type] || 1);
      let count = Math.max(1, Math.round((weight / totalWeight) * MAX_PARTICLES));
      count = Math.min(count, MAX_PARTICLES - particleCount);

      const color = ROAD_COLORS[road.type] || ROAD_COLORS.secondary;
      const pixelSize = ROAD_PIXEL_SIZES[road.type] || 2.5;
      const speed = ROAD_SPEEDS[road.type] || 10;

      for (let j = 0; j < count; j++) {
        const progress = Math.random();
        const pos = this.interpolatePosition(road, progress);

        const point = this.pointCollection.add({
          position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 2),
          color,
          pixelSize,
          scaleByDistance: new Cesium.NearFarScalar(500, 1.2, 15000, 0.3),
          translucencyByDistance: new Cesium.NearFarScalar(500, 1.0, 20000, 0.0),
        });

        this.particles.push({
          segmentIndex: i,
          progress,
          speed: speed / Math.max(road.length, 1),
          pointIndex: this.pointCollection.length - 1,
        });

        particleCount++;
      }
    }
  }

  private updateParticles(dt: number) {
    for (const particle of this.particles) {
      const road = this.roads[particle.segmentIndex];
      if (!road) continue;

      // Move forward
      particle.progress += particle.speed * dt;
      if (particle.progress > 1) {
        particle.progress -= 1;
      }

      const pos = this.interpolatePosition(road, particle.progress);
      const point = this.pointCollection.get(particle.pointIndex);
      if (point) {
        point.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 2);
      }
    }
  }

  private interpolatePosition(road: RoadSegment, progress: number): { lon: number; lat: number } {
    const pts = road.points;
    if (pts.length < 2) return pts[0];

    // Calculate cumulative distances
    const distances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < pts.length; i++) {
      const dlat = (pts[i].lat - pts[i - 1].lat) * 111320;
      const dlon = (pts[i].lon - pts[i - 1].lon) * 111320 * Math.cos((pts[i].lat * Math.PI) / 180);
      totalDist += Math.sqrt(dlat * dlat + dlon * dlon);
      distances.push(totalDist);
    }

    const targetDist = progress * totalDist;

    // Find segment
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] >= targetDist) {
        const segLen = distances[i] - distances[i - 1];
        if (segLen === 0) return pts[i];
        const t = (targetDist - distances[i - 1]) / segLen;
        return {
          lon: pts[i - 1].lon + (pts[i].lon - pts[i - 1].lon) * t,
          lat: pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * t,
        };
      }
    }

    return pts[pts.length - 1];
  }

  private clearParticles() {
    this.pointCollection.removeAll();
    this.particles = [];
  }
}
