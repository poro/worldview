import * as Cesium from 'cesium';
import { fetchFlights } from './api';
import { FlightState, parseFlightState } from './types';
import { altitudeToColor } from '../utils/format';
import { isMilitaryFlight, MILITARY_SVG } from './military';

const AIRCRAFT_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 2L8 10H2L4 13H8L10 22H14L12 13H20L22 10H16L12 2Z"/></svg>`)}`;

const MILITARY_COLOR = Cesium.Color.fromCssColorString('#ff4500'); // Red-orange
const MILITARY_COLOR_DIM = Cesium.Color.fromCssColorString('#ff4500').withAlpha(0.5);
const COMMERCIAL_DIM_ALPHA = 0.15;

export class FlightTracker {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private flights: Map<string, FlightState> = new Map();
  private militaryIcaos: Set<string> = new Set();
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastUpdate: number = 0;
  private _visible: boolean = true;
  private _militaryMode: boolean = false;
  private _selectedFlight: FlightState | null = null;
  private onSelect: ((flight: FlightState | null) => void) | null = null;
  private onCountUpdate: ((count: number) => void) | null = null;
  private onMilitaryCountUpdate: ((count: number) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get flightCount(): number {
    return this.flights.size;
  }

  get militaryCount(): number {
    return this.militaryIcaos.size;
  }

  get selectedFlight(): FlightState | null {
    return this._selectedFlight;
  }

  get visible(): boolean {
    return this._visible;
  }

  get militaryMode(): boolean {
    return this._militaryMode;
  }

  get lastUpdateTime(): number {
    return this.lastUpdate;
  }

  setOnSelect(cb: (flight: FlightState | null) => void) {
    this.onSelect = cb;
  }

  setOnCountUpdate(cb: (count: number) => void) {
    this.onCountUpdate = cb;
  }

  setOnMilitaryCountUpdate(cb: (count: number) => void) {
    this.onMilitaryCountUpdate = cb;
  }

  async start() {
    await this.update();
    this.interval = setInterval(() => this.update(), 15000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((entity) => {
      entity.show = this._visible;
    });
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
          // Make military aircraft bright
          if (entity.billboard) {
            entity.billboard.color = MILITARY_COLOR as any;
            entity.billboard.scale = 1.3 as any;
          }
        } else {
          // Dim commercial traffic
          entity.show = this._visible;
          if (entity.billboard) {
            const flight = this.flights.get(icao);
            const alt = flight?.baroAltitude || flight?.geoAltitude || 10000;
            const baseColor = Cesium.Color.fromCssColorString(altitudeToColor(alt));
            entity.billboard.color = baseColor.withAlpha(COMMERCIAL_DIM_ALPHA) as any;
            entity.billboard.scale = 0.6 as any;
          }
          if (entity.label) {
            entity.label.show = false as any;
          }
        }
      } else {
        // Normal mode: restore colors
        entity.show = this._visible;
        const flight = this.flights.get(icao);
        if (flight) {
          const alt = flight.baroAltitude || flight.geoAltitude || 10000;
          if (isMil) {
            if (entity.billboard) {
              entity.billboard.color = MILITARY_COLOR as any;
              entity.billboard.scale = 1.0 as any;
            }
          } else {
            if (entity.billboard) {
              entity.billboard.color = Cesium.Color.fromCssColorString(altitudeToColor(alt)) as any;
              entity.billboard.scale = 1.0 as any;
            }
          }
          if (entity.label) {
            entity.label.show = true as any;
          }
        }
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
      this.onSelect?.(flight);
    }
  }

  handlePick(pickedObject: any): boolean {
    if (pickedObject?.id?.properties?.icao24) {
      const icao = pickedObject.id.properties.icao24.getValue(Cesium.JulianDate.now());
      this.selectByIcao(icao);
      return true;
    }
    return false;
  }

  private async update() {
    try {
      const data = await fetchFlights();
      if (!data.states) return;

      this.lastUpdate = Date.now();
      const currentIcaos = new Set<string>();
      this.militaryIcaos.clear();

      for (const raw of data.states) {
        const flight = parseFlightState(raw);
        if (flight.longitude === null || flight.latitude === null) continue;
        if (flight.onGround) continue;

        currentIcaos.add(flight.icao24);
        this.flights.set(flight.icao24, flight);

        const isMil = isMilitaryFlight(flight);
        if (isMil) {
          this.militaryIcaos.add(flight.icao24);
        }

        const alt = flight.baroAltitude || flight.geoAltitude || 10000;
        const color = isMil
          ? MILITARY_COLOR
          : Cesium.Color.fromCssColorString(altitudeToColor(alt));
        const heading = flight.trueTrack || 0;
        const icon = isMil ? MILITARY_SVG : AIRCRAFT_SVG;

        if (this.entities.has(flight.icao24)) {
          const entity = this.entities.get(flight.icao24)!;
          entity.position = Cesium.Cartesian3.fromDegrees(
            flight.longitude,
            flight.latitude,
            alt
          ) as any;
          if (entity.billboard) {
            entity.billboard.rotation = Cesium.Math.toRadians(-heading) as any;
            entity.billboard.image = icon as any;
            if (this._militaryMode) {
              if (isMil) {
                entity.billboard.color = MILITARY_COLOR as any;
                entity.billboard.scale = 1.3 as any;
              } else {
                entity.billboard.color = color.withAlpha(COMMERCIAL_DIM_ALPHA) as any;
                entity.billboard.scale = 0.6 as any;
              }
            } else {
              entity.billboard.color = color as any;
              entity.billboard.scale = 1.0 as any;
            }
          }
          if (entity.label) {
            entity.label.text = (flight.callsign || flight.icao24) as any;
            if (this._militaryMode && !isMil) {
              entity.label.show = false as any;
            } else {
              entity.label.show = true as any;
            }
          }
        } else {
          const entity = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              flight.longitude,
              flight.latitude,
              alt
            ),
            billboard: {
              image: icon,
              width: isMil ? 22 : 20,
              height: isMil ? 22 : 20,
              rotation: Cesium.Math.toRadians(-heading),
              color: this._militaryMode && !isMil ? color.withAlpha(COMMERCIAL_DIM_ALPHA) : color,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 1e7, 0.4),
              translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 2e7, 0.3),
              scale: this._militaryMode && isMil ? 1.3 : 1.0,
            },
            label: {
              text: flight.callsign || flight.icao24,
              font: '11px JetBrains Mono',
              fillColor: isMil
                ? Cesium.Color.fromCssColorString('#ff6633')
                : Cesium.Color.fromCssColorString('#c0c0c0'),
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
      }

      // Remove stale entities
      for (const [icao, entity] of this.entities) {
        if (!currentIcaos.has(icao)) {
          this.viewer.entities.remove(entity);
          this.entities.delete(icao);
          this.flights.delete(icao);
        }
      }

      this.onCountUpdate?.(this.flights.size);
      this.onMilitaryCountUpdate?.(this.militaryIcaos.size);

      // Update selected flight data
      if (this._selectedFlight) {
        const updated = this.flights.get(this._selectedFlight.icao24);
        if (updated) {
          this._selectedFlight = updated;
          this.onSelect?.(updated);
        }
      }
    } catch (e) {
      console.warn('Flight update failed:', e);
    }
  }
}
