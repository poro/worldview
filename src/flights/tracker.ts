import * as Cesium from 'cesium';
import { fetchFlights } from './api';
import { FlightState, parseFlightState } from './types';
import { TimeController } from '../time/controller';
import { altitudeToColor } from '../utils/format';
import {
  classifyMilitary,
  MilitaryClassification,
  MilitaryAircraftCategory,
  MilitaryCategoryCounts,
  emptyCategoryCounts,
  MILITARY_CATEGORY_SVGS,
  MILITARY_CATEGORY_COLORS,
  checkSquawk,
  SquawkAlert,
} from './military';
import {
  FLIGHT_UPDATE_INTERVAL,
  FLIGHT_TRAIL_MAX_POINTS,
  FLIGHT_TRAIL_WIDTH,
  COLORS,
  AIRCRAFT_ICON_SIZE,
  AIRCRAFT_ICON_SIZE_MILITARY,
  AIRCRAFT_LABEL_FONT,
  AIRCRAFT_SCALE_NEAR,
  AIRCRAFT_SCALE_FAR,
  AIRCRAFT_SCALE_NEAR_DIST,
  AIRCRAFT_SCALE_FAR_DIST,
  AIRCRAFT_TRANS_NEAR_DIST,
  AIRCRAFT_TRANS_FAR_DIST,
} from '../config';

const AIRCRAFT_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 2L8 10H2L4 13H8L10 22H14L12 13H20L22 10H16L12 2Z"/></svg>`)}`;

export interface MilitaryFlightInfo {
  flight: FlightState;
  classification: MilitaryClassification;
  squawkAlert: SquawkAlert | null;
}

export class FlightTracker {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private trailEntities: Map<string, Cesium.Entity> = new Map();
  private flights: Map<string, FlightState> = new Map();
  private positionHistory: Map<string, { lon: number; lat: number; alt: number }[]> = new Map();
  private militaryIcaos: Set<string> = new Set();
  private militaryClassifications: Map<string, MilitaryClassification> = new Map();
  private _militaryCategoryCounts: MilitaryCategoryCounts = emptyCategoryCounts();
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastUpdate: number = 0;
  private _visible: boolean = true;
  private _militaryMode: boolean = false;
  private _selectedFlight: FlightState | null = null;
  private onSelect: ((flight: FlightState | null, milInfo?: MilitaryFlightInfo) => void) | null = null;
  private onCountUpdate: ((count: number) => void) | null = null;
  private onMilitaryCountUpdate: ((count: number, categoryCounts: MilitaryCategoryCounts) => void) | null = null;
  private onError: ((msg: string) => void) | null = null;
  private timeController: TimeController | null = null;
  private recorderUrl: string = 'http://localhost:3020';

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  setTimeController(tc: TimeController, recorderUrl?: string) {
    this.timeController = tc;
    if (recorderUrl) this.recorderUrl = recorderUrl;
  }

  get flightCount(): number { return this.flights.size; }
  get militaryCount(): number { return this.militaryIcaos.size; }
  get militaryCategoryCounts(): MilitaryCategoryCounts { return this._militaryCategoryCounts; }
  get selectedFlight(): FlightState | null { return this._selectedFlight; }
  get visible(): boolean { return this._visible; }
  get militaryMode(): boolean { return this._militaryMode; }
  get lastUpdateTime(): number { return this.lastUpdate; }

  setOnSelect(cb: (flight: FlightState | null, milInfo?: MilitaryFlightInfo) => void) { this.onSelect = cb; }
  setOnCountUpdate(cb: (count: number) => void) { this.onCountUpdate = cb; }
  setOnMilitaryCountUpdate(cb: (count: number, categoryCounts: MilitaryCategoryCounts) => void) { this.onMilitaryCountUpdate = cb; }
  setOnError(cb: (msg: string) => void) { this.onError = cb; }

  async start() {
    await this.update();
    this.interval = setInterval(() => this.update(), FLIGHT_UPDATE_INTERVAL);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((entity) => { entity.show = this._visible; });
    this.trailEntities.forEach((entity) => { entity.show = this._visible; });
  }

  toggleMilitary() {
    this._militaryMode = !this._militaryMode;
    this.applyMilitaryFilter();
  }

  setMilitaryMode(active: boolean) {
    this._militaryMode = active;
    this.applyMilitaryFilter();
  }

  private applyMilitaryFilter() {
    this.entities.forEach((entity, icao) => {
      const isMil = this.militaryIcaos.has(icao);

      if (this._militaryMode) {
        if (isMil) {
          entity.show = this._visible;
          if (entity.billboard) {
            const cls = this.militaryClassifications.get(icao);
            const cat = cls?.category || 'unknown';
            const milColor = Cesium.Color.fromCssColorString(MILITARY_CATEGORY_COLORS[cat]);
            entity.billboard.color = new Cesium.ConstantProperty(milColor);
            entity.billboard.scale = new Cesium.ConstantProperty(1.3);
          }
        } else {
          entity.show = this._visible;
          if (entity.billboard) {
            const flight = this.flights.get(icao);
            const alt = flight?.baroAltitude || flight?.geoAltitude || 10000;
            const baseColor = Cesium.Color.fromCssColorString(altitudeToColor(alt));
            entity.billboard.color = new Cesium.ConstantProperty(baseColor.withAlpha(COLORS.commercialDimAlpha));
            entity.billboard.scale = new Cesium.ConstantProperty(0.6);
          }
          if (entity.label) {
            entity.label.show = new Cesium.ConstantProperty(false);
          }
        }
      } else {
        entity.show = this._visible;
        const flight = this.flights.get(icao);
        if (flight) {
          const alt = flight.baroAltitude || flight.geoAltitude || 10000;
          if (isMil) {
            if (entity.billboard) {
              const cls = this.militaryClassifications.get(icao);
              const cat = cls?.category || 'unknown';
              const milColor = Cesium.Color.fromCssColorString(MILITARY_CATEGORY_COLORS[cat]);
              entity.billboard.color = new Cesium.ConstantProperty(milColor);
              entity.billboard.scale = new Cesium.ConstantProperty(1.0);
            }
          } else {
            if (entity.billboard) {
              entity.billboard.color = new Cesium.ConstantProperty(Cesium.Color.fromCssColorString(altitudeToColor(alt)));
              entity.billboard.scale = new Cesium.ConstantProperty(1.0);
            }
          }
          if (entity.label) {
            entity.label.show = new Cesium.ConstantProperty(true);
          }
        }
      }
    });

    // Show/hide trails based on military mode
    this.trailEntities.forEach((entity, icao) => {
      if (this._militaryMode) {
        const isMil = this.militaryIcaos.has(icao);
        entity.show = this._visible && isMil;
      } else {
        entity.show = this._visible;
      }
    });
  }

  selectByIcao(icao: string | null) {
    if (icao === null) {
      this._selectedFlight = null;
      this.onSelect?.(null);
      return;
    }
    const flight = this.flights.get(icao);
    if (flight) {
      this._selectedFlight = flight;
      const cls = this.militaryClassifications.get(icao);
      if (cls?.isMilitary) {
        this.onSelect?.(flight, {
          flight,
          classification: cls,
          squawkAlert: checkSquawk(flight.squawk),
        });
      } else {
        this.onSelect?.(flight);
      }
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.icao24) {
      const icao = pickedObject.id.properties.icao24.getValue(Cesium.JulianDate.now());
      this.selectByIcao(icao);
      return true;
    }
    return false;
  }

  private async fetchReplayFlights(): Promise<{ time: number; states: unknown[] | null }> {
    if (!this.timeController) return { time: 0, states: null };
    const t = this.timeController.getEffectiveTime();
    const unix = Math.floor(t.getTime() / 1000);
    try {
      const res = await fetch(`${this.recorderUrl}/api/snapshots?source=flights&time=${unix}&range=300`);
      if (!res.ok) return { time: unix, states: null };
      const data = await res.json();
      const rows = data.rows || data.entities || [];
      // Convert recorder rows to OpenSky-compatible state arrays
      const states = rows.map((r: Record<string, unknown>) => [
        r.icao || '', r.callsign || '', r.source || 'recorded',
        unix, unix,
        r.lon, r.lat,
        typeof r.altitude === 'number' ? r.altitude * 0.3048 : null,
        false,
        typeof r.speed === 'number' ? r.speed * 0.514444 : null,
        r.heading ?? null,
        null, null, null,
        r.squawk || null,
      ]);
      return { time: unix, states };
    } catch {
      return { time: unix, states: null };
    }
  }

  private async update() {
    try {
      // Use recorder data in REPLAY mode
      const data = (this.timeController && this.timeController.isReplay)
        ? await this.fetchReplayFlights()
        : await fetchFlights();
      if (!data.states) return;

      this.lastUpdate = Date.now();
      const currentIcaos = new Set<string>();
      this.militaryIcaos.clear();
      this.militaryClassifications.clear();
      const categoryCounts = emptyCategoryCounts();

      // Batch entity updates
      this.viewer.entities.suspendEvents();

      try {
        for (const raw of data.states) {
          const flight = parseFlightState(raw as (string | number | boolean | null)[]);
          if (flight.longitude === null || flight.latitude === null) continue;
          if (flight.onGround) continue;

          currentIcaos.add(flight.icao24);
          this.flights.set(flight.icao24, flight);

          const cls = classifyMilitary(flight);
          const isMil = cls.isMilitary;
          if (isMil) {
            this.militaryIcaos.add(flight.icao24);
            this.militaryClassifications.set(flight.icao24, cls);
            categoryCounts[cls.category]++;
          }

          const alt = flight.baroAltitude || flight.geoAltitude || 10000;
          const milColor = isMil
            ? Cesium.Color.fromCssColorString(MILITARY_CATEGORY_COLORS[cls.category])
            : null;
          const color = milColor || Cesium.Color.fromCssColorString(altitudeToColor(alt));
          const heading = flight.trueTrack || 0;
          const icon = isMil ? MILITARY_CATEGORY_SVGS[cls.category] : AIRCRAFT_SVG;

          // Track position history for trails
          this.trackPosition(flight.icao24, flight.longitude, flight.latitude, alt);

          if (this.entities.has(flight.icao24)) {
            const entity = this.entities.get(flight.icao24)!;
            entity.position = Cesium.Cartesian3.fromDegrees(
              flight.longitude, flight.latitude, alt
            ) as unknown as Cesium.PositionProperty;
            if (entity.billboard) {
              entity.billboard.rotation = new Cesium.ConstantProperty(Cesium.Math.toRadians(-heading));
              entity.billboard.image = new Cesium.ConstantProperty(icon);
              if (this._militaryMode) {
                if (isMil) {
                  entity.billboard.color = new Cesium.ConstantProperty(color);
                  entity.billboard.scale = new Cesium.ConstantProperty(1.3);
                } else {
                  entity.billboard.color = new Cesium.ConstantProperty(color.withAlpha(COLORS.commercialDimAlpha));
                  entity.billboard.scale = new Cesium.ConstantProperty(0.6);
                }
              } else {
                entity.billboard.color = new Cesium.ConstantProperty(color);
                entity.billboard.scale = new Cesium.ConstantProperty(1.0);
              }
            }
            if (entity.label) {
              entity.label.text = new Cesium.ConstantProperty(flight.callsign || flight.icao24);
              if (this._militaryMode && !isMil) {
                entity.label.show = new Cesium.ConstantProperty(false);
              } else {
                entity.label.show = new Cesium.ConstantProperty(true);
              }
            }
          } else {
            const entity = this.viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, alt),
              billboard: {
                image: icon,
                width: isMil ? AIRCRAFT_ICON_SIZE_MILITARY : AIRCRAFT_ICON_SIZE,
                height: isMil ? AIRCRAFT_ICON_SIZE_MILITARY : AIRCRAFT_ICON_SIZE,
                rotation: Cesium.Math.toRadians(-heading),
                color: this._militaryMode && !isMil ? color.withAlpha(COLORS.commercialDimAlpha) : color,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scaleByDistance: new Cesium.NearFarScalar(AIRCRAFT_SCALE_NEAR_DIST, AIRCRAFT_SCALE_NEAR, AIRCRAFT_SCALE_FAR_DIST, AIRCRAFT_SCALE_FAR),
                translucencyByDistance: new Cesium.NearFarScalar(AIRCRAFT_TRANS_NEAR_DIST, 1.0, AIRCRAFT_TRANS_FAR_DIST, 0.3),
                scale: this._militaryMode && isMil ? 1.3 : 1.0,
              },
              label: {
                text: flight.callsign || flight.icao24,
                font: AIRCRAFT_LABEL_FONT,
                fillColor: isMil
                  ? Cesium.Color.fromCssColorString(MILITARY_CATEGORY_COLORS[cls.category])
                  : Cesium.Color.fromCssColorString(COLORS.commercialLabel),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -18),
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.0),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e6),
                show: !(this._militaryMode && !isMil),
              },
              properties: {
                icao24: flight.icao24,
                type: 'flight',
                military: isMil,
              },
              show: this._visible,
            });
            this.entities.set(flight.icao24, entity);
          }

          // Update trail polyline
          this.updateTrail(flight.icao24, isMil, alt, cls.category);
        }

        // Remove stale entities
        for (const [icao, entity] of this.entities) {
          if (!currentIcaos.has(icao)) {
            this.viewer.entities.remove(entity);
            this.entities.delete(icao);
            this.flights.delete(icao);
            this.positionHistory.delete(icao);
            const trail = this.trailEntities.get(icao);
            if (trail) {
              this.viewer.entities.remove(trail);
              this.trailEntities.delete(icao);
            }
          }
        }
      } finally {
        this.viewer.entities.resumeEvents();
      }

      this._militaryCategoryCounts = categoryCounts;
      this.onCountUpdate?.(this.flights.size);
      this.onMilitaryCountUpdate?.(this.militaryIcaos.size, categoryCounts);

      // Update selected flight data
      if (this._selectedFlight) {
        const updated = this.flights.get(this._selectedFlight.icao24);
        if (updated) {
          this._selectedFlight = updated;
          const cls = this.militaryClassifications.get(updated.icao24);
          if (cls?.isMilitary) {
            this.onSelect?.(updated, {
              flight: updated,
              classification: cls,
              squawkAlert: checkSquawk(updated.squawk),
            });
          } else {
            this.onSelect?.(updated);
          }
        }
      }
    } catch (e) {
      console.warn('Flight update failed:', e);
      this.onError?.('FLIGHT DATA FEED UNAVAILABLE');
    }
  }

  private trackPosition(icao: string, lon: number, lat: number, alt: number) {
    let history = this.positionHistory.get(icao);
    if (!history) {
      history = [];
      this.positionHistory.set(icao, history);
    }
    history.push({ lon, lat, alt });
    if (history.length > FLIGHT_TRAIL_MAX_POINTS) {
      history.shift();
    }
  }

  private updateTrail(icao: string, isMil: boolean, alt: number, category: MilitaryAircraftCategory) {
    const history = this.positionHistory.get(icao);
    if (!history || history.length < 2) return;

    const positions = history.map(p =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)
    );

    const trailColor = isMil
      ? Cesium.Color.fromCssColorString(MILITARY_CATEGORY_COLORS[category]).withAlpha(0.4)
      : Cesium.Color.fromCssColorString(altitudeToColor(alt)).withAlpha(0.3);

    if (this.trailEntities.has(icao)) {
      const trail = this.trailEntities.get(icao)!;
      if (trail.polyline) {
        trail.polyline.positions = new Cesium.ConstantProperty(positions);
      }
    } else {
      const trail = this.viewer.entities.add({
        polyline: {
          positions,
          width: FLIGHT_TRAIL_WIDTH,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.15,
            color: trailColor,
          }),
        },
        properties: { type: 'flight-trail', icao24: icao },
        show: this._visible && !(this._militaryMode && !isMil),
      });
      this.trailEntities.set(icao, trail);
    }
  }
}
