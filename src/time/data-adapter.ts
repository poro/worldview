// ============================================
// DataAdapter — Abstract interface for time-aware data fetching
// Each data layer implements this to support LIVE + REPLAY modes.
// ============================================

import { TimeController } from './controller';

/** Generic entity returned by adapters */
export interface SnapshotEntity {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  speed: number;
  label: string;
  type: string;
  /** Raw source-specific properties */
  properties: Record<string, unknown>;
}

/** Timeline event marker */
export interface TimelineEvent {
  time: Date;
  lat: number;
  lon: number;
  title: string;
  type: string;
  description: string;
}

/** Response from snapshot queries */
export interface SnapshotResponse {
  entities: SnapshotEntity[];
  timestamp: Date;
  source: string;
}

// ============================================
// Abstract DataAdapter interface
// ============================================

export interface DataAdapter {
  readonly source: string;

  /**
   * Fetch data for a given timestamp.
   * In LIVE mode, returns current API data.
   * In REPLAY mode, returns recorded snapshot data.
   */
  getDataAtTime(timestamp: Date): Promise<SnapshotResponse>;

  /**
   * Fetch timeline events within a time range.
   */
  getEvents?(startTime: Date, endTime: Date): Promise<TimelineEvent[]>;
}

// ============================================
// LivePassthroughAdapter
// Wraps existing live fetch functions. In LIVE mode,
// just calls the original fetcher. In REPLAY mode,
// delegates to a replay adapter.
// ============================================

export class LivePassthroughAdapter implements DataAdapter {
  readonly source: string;
  private liveFetcher: () => Promise<SnapshotEntity[]>;
  private replayAdapter: DataAdapter | null;
  private timeController: TimeController;

  constructor(
    source: string,
    timeController: TimeController,
    liveFetcher: () => Promise<SnapshotEntity[]>,
    replayAdapter?: DataAdapter,
  ) {
    this.source = source;
    this.timeController = timeController;
    this.liveFetcher = liveFetcher;
    this.replayAdapter = replayAdapter || null;
  }

  async getDataAtTime(timestamp: Date): Promise<SnapshotResponse> {
    if (this.timeController.isLive) {
      const entities = await this.liveFetcher();
      return { entities, timestamp: new Date(), source: this.source };
    }

    // REPLAY mode — use replay adapter if available
    if (this.replayAdapter) {
      return this.replayAdapter.getDataAtTime(timestamp);
    }

    // No replay adapter — return empty
    return { entities: [], timestamp, source: this.source };
  }
}

// ============================================
// SnapshotAPIAdapter
// Fetches recorded data from the SQLite REST API
// GET /api/snapshots?source=flights&time=ISO&range=60
// ============================================

export class SnapshotAPIAdapter implements DataAdapter {
  readonly source: string;
  private baseUrl: string;
  private rangeSeconds: number;
  private cache: Map<string, { data: SnapshotResponse; fetchedAt: number }> = new Map();
  private static readonly CACHE_TTL = 5000; // 5s cache for replay data

  constructor(source: string, baseUrl: string = '/recorder', rangeSeconds: number = 60) {
    this.source = source;
    this.baseUrl = baseUrl;
    this.rangeSeconds = rangeSeconds;
  }

  async getDataAtTime(timestamp: Date): Promise<SnapshotResponse> {
    const timeKey = this.quantizeTime(timestamp);
    const cacheKey = `${this.source}:${timeKey}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.fetchedAt) < SnapshotAPIAdapter.CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/api/snapshots?source=${encodeURIComponent(this.source)}&time=${encodeURIComponent(timeKey)}&range=${this.rangeSeconds}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[SnapshotAPI] ${this.source} fetch failed: ${response.status}`);
        return { entities: [], timestamp, source: this.source };
      }

      const data = await response.json();
      const entities: SnapshotEntity[] = (data.entities || []).map((e: Record<string, unknown>) => ({
        id: String(e.id || ''),
        lat: Number(e.lat || 0),
        lon: Number(e.lon || 0),
        alt: Number(e.alt || 0),
        heading: Number(e.heading || 0),
        speed: Number(e.speed || 0),
        label: String(e.label || ''),
        type: String(e.type || ''),
        properties: (e.properties as Record<string, unknown>) || {},
      }));

      const result: SnapshotResponse = { entities, timestamp, source: this.source };
      this.cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
      return result;
    } catch (e) {
      console.warn(`[SnapshotAPI] ${this.source} error:`, e);
      return { entities: [], timestamp, source: this.source };
    }
  }

  async getEvents(startTime: Date, endTime: Date): Promise<TimelineEvent[]> {
    try {
      const url = `${this.baseUrl}/api/events?start=${encodeURIComponent(startTime.toISOString())}&end=${encodeURIComponent(endTime.toISOString())}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      return (data.events || []).map((e: Record<string, unknown>) => ({
        time: new Date(String(e.time)),
        lat: Number(e.lat || 0),
        lon: Number(e.lon || 0),
        title: String(e.title || ''),
        type: String(e.type || 'incident'),
        description: String(e.description || ''),
      }));
    } catch {
      return [];
    }
  }

  /** Quantize time to nearest minute for cache efficiency */
  private quantizeTime(date: Date): string {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d.toISOString();
  }
}

// ============================================
// MockReplayAdapter
// Generates plausible dummy data for any timestamp.
// Used for development/testing when no recorder is running.
// ============================================

export class MockReplayAdapter implements DataAdapter {
  readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  async getDataAtTime(timestamp: Date): Promise<SnapshotResponse> {
    const seed = Math.floor(timestamp.getTime() / 60000); // Changes every minute
    const entities = this.generateEntities(seed);
    return { entities, timestamp, source: this.source };
  }

  async getEvents(startTime: Date, endTime: Date): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    const rangeMs = endMs - startMs;

    // Generate ~1 event per hour of range
    const numEvents = Math.max(1, Math.floor(rangeMs / 3600000));
    const types: TimelineEvent['type'][] = ['strike', 'diplomatic', 'military_movement', 'incident'];
    const titles = [
      'Airstrike detected', 'Naval exercise begins', 'Diplomatic convoy movement',
      'Maritime incident reported', 'Military deployment observed', 'Airspace violation',
      'Troop movement detected', 'Carrier group repositioning',
    ];

    for (let i = 0; i < numEvents && i < 20; i++) {
      const t = startMs + (rangeMs * (i + 0.5)) / numEvents;
      const hash = this.simpleHash(t);
      events.push({
        time: new Date(t),
        lat: ((hash % 1200) - 600) / 10,
        lon: ((hash * 7 % 3600) - 1800) / 10,
        title: titles[hash % titles.length],
        type: types[hash % types.length],
        description: `Event at ${new Date(t).toISOString()}`,
      });
    }

    return events;
  }

  private generateEntities(seed: number): SnapshotEntity[] {
    const count = 10 + (seed % 20);
    const entities: SnapshotEntity[] = [];

    for (let i = 0; i < count; i++) {
      const hash = this.simpleHash(seed * 1000 + i);
      const lat = ((hash % 1600) - 800) / 10;
      const lon = ((hash * 13 % 3600) - 1800) / 10;

      if (this.source === 'flights') {
        entities.push({
          id: `MOCK-${seed}-${i}`,
          lat,
          lon,
          alt: 5000 + (hash % 8000),
          heading: hash % 360,
          speed: 200 + (hash % 300),
          label: `WV${String(hash % 9999).padStart(4, '0')}`,
          type: 'flight',
          properties: {
            icao24: `mock${String(i).padStart(4, '0')}`,
            callsign: `WV${String(hash % 9999).padStart(4, '0')}`,
            onGround: false,
            baroAltitude: 5000 + (hash % 8000),
            geoAltitude: 5000 + (hash % 8000),
            trueTrack: hash % 360,
            velocity: 200 + (hash % 300),
            originCountry: 'MOCK',
          },
        });
      } else if (this.source === 'satellites') {
        entities.push({
          id: `SAT-${seed}-${i}`,
          lat,
          lon,
          alt: 200 + (hash % 35000),
          heading: 0,
          speed: 7000 + (hash % 1000),
          label: `SAT-${hash % 99999}`,
          type: 'satellite',
          properties: {
            noradId: String(10000 + (hash % 50000)),
            category: ['stations', 'military', 'weather', 'gps'][hash % 4],
          },
        });
      } else if (this.source === 'maritime') {
        entities.push({
          id: `MMSI-${seed}-${i}`,
          lat,
          lon,
          alt: 0,
          heading: hash % 360,
          speed: 5 + (hash % 25),
          label: `VESSEL-${hash % 9999}`,
          type: 'vessel',
          properties: {
            mmsi: `${200000000 + hash % 800000000}`,
            name: `VESSEL-${hash % 9999}`,
            vesselType: ['cargo', 'tanker', 'military', 'fishing'][hash % 4],
            isMilitary: (hash % 8) === 0,
          },
        });
      }
    }

    return entities;
  }

  private simpleHash(n: number): number {
    let h = Math.abs(n);
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return Math.abs(h);
  }
}

// ============================================
// InterpolationHelper
// Smoothly interpolates entity positions between
// two snapshot timestamps for fluid replay.
// ============================================

export class InterpolationHelper {
  private prevSnapshot: SnapshotResponse | null = null;
  private nextSnapshot: SnapshotResponse | null = null;

  update(snapshot: SnapshotResponse) {
    this.prevSnapshot = this.nextSnapshot;
    this.nextSnapshot = snapshot;
  }

  /** Get interpolated position for an entity between prev and next snapshots */
  interpolate(entityId: string, currentTime: Date): SnapshotEntity | null {
    if (!this.prevSnapshot || !this.nextSnapshot) {
      const snap = this.nextSnapshot || this.prevSnapshot;
      return snap?.entities.find(e => e.id === entityId) || null;
    }

    const prevEntity = this.prevSnapshot.entities.find(e => e.id === entityId);
    const nextEntity = this.nextSnapshot.entities.find(e => e.id === entityId);

    if (!prevEntity || !nextEntity) {
      return nextEntity || prevEntity || null;
    }

    const prevTime = this.prevSnapshot.timestamp.getTime();
    const nextTime = this.nextSnapshot.timestamp.getTime();
    const currTime = currentTime.getTime();

    if (nextTime <= prevTime) return nextEntity;

    const t = Math.max(0, Math.min(1, (currTime - prevTime) / (nextTime - prevTime)));

    return {
      ...nextEntity,
      lat: prevEntity.lat + (nextEntity.lat - prevEntity.lat) * t,
      lon: prevEntity.lon + (nextEntity.lon - prevEntity.lon) * t,
      alt: prevEntity.alt + (nextEntity.alt - prevEntity.alt) * t,
      heading: this.lerpAngle(prevEntity.heading, nextEntity.heading, t),
      speed: prevEntity.speed + (nextEntity.speed - prevEntity.speed) * t,
    };
  }

  /** Get all interpolated entities */
  interpolateAll(currentTime: Date): SnapshotEntity[] {
    const snap = this.nextSnapshot || this.prevSnapshot;
    if (!snap) return [];

    return snap.entities.map(e => this.interpolate(e.id, currentTime)).filter(Boolean) as SnapshotEntity[];
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return a + diff * t;
  }
}
