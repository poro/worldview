// ============================================
// Aircraft Detail Popup — hover/click tooltip
// ============================================

import * as Cesium from 'cesium';
import { FlightState } from '../flights/types';
import { MilitaryClassification } from '../flights/military';
import { formatAltitude, formatSpeed } from '../utils/format';

export class AircraftPopup {
  private viewer: Cesium.Viewer;
  private popup: HTMLElement;
  private _visible: boolean = false;
  private handler: Cesium.ScreenSpaceEventHandler;
  private currentIcao: string | null = null;
  private getFlightData: ((icao: string) => { flight: FlightState; milClass?: MilitaryClassification } | null) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.popup = this.createPopup();
    document.body.appendChild(this.popup);

    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      this.onMouseMove(movement.endPosition);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  setFlightDataProvider(fn: (icao: string) => { flight: FlightState; milClass?: MilitaryClassification } | null) {
    this.getFlightData = fn;
  }

  private createPopup(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'aircraft-popup';
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 200;
      background: rgba(10, 10, 15, 0.95);
      border: 1px solid rgba(0, 255, 136, 0.25);
      border-radius: 4px;
      padding: 10px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #e0e0e0;
      backdrop-filter: blur(12px);
      display: none;
      min-width: 180px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;
    return el;
  }

  private onMouseMove(position: Cesium.Cartesian2) {
    const picked = this.viewer.scene.pick(position);

    if (picked?.id?.properties?.icao24) {
      const icao = picked.id.properties.icao24.getValue(Cesium.JulianDate.now());
      if (icao !== this.currentIcao) {
        this.currentIcao = icao;
        this.updateContent(icao);
      }
      this.popup.style.display = 'block';
      this.popup.style.left = `${position.x + 16}px`;
      this.popup.style.top = `${position.y - 10}px`;
      this._visible = true;
    } else {
      this.hide();
    }
  }

  private updateContent(icao: string) {
    if (!this.getFlightData) {
      this.popup.innerHTML = `<div style="color:#00ff88">${icao}</div>`;
      return;
    }

    const data = this.getFlightData(icao);
    if (!data) {
      this.popup.innerHTML = `<div style="color:#00ff88">${icao}</div>`;
      return;
    }

    const f = data.flight;
    const mil = data.milClass;
    const isMil = mil?.isMilitary;
    const accentColor = isMil ? '#ffb300' : '#00ff88';

    const rows: string[] = [];
    rows.push(`<div style="color:${accentColor};font-size:12px;font-weight:600;margin-bottom:4px">${f.callsign || f.icao24}</div>`);

    if (isMil && mil) {
      rows.push(`<div style="color:#ff4500;font-size:9px;letter-spacing:0.1em;margin-bottom:4px">${mil.typeName}</div>`);
      rows.push(`<div class="popup-row"><span>MISSION</span><span>${mil.probableMission}</span></div>`);
    }

    rows.push(`<div class="popup-row"><span>ICAO</span><span>${f.icao24.toUpperCase()}</span></div>`);
    if (f.originCountry) rows.push(`<div class="popup-row"><span>ORIGIN</span><span>${f.originCountry}</span></div>`);
    rows.push(`<div class="popup-row"><span>ALT</span><span>${formatAltitude(f.baroAltitude || f.geoAltitude)}</span></div>`);
    rows.push(`<div class="popup-row"><span>SPD</span><span>${formatSpeed(f.velocity)}</span></div>`);
    if (f.squawk) rows.push(`<div class="popup-row"><span>SQUAWK</span><span>${f.squawk}</span></div>`);

    this.popup.innerHTML = rows.join('');
  }

  private hide() {
    if (this._visible) {
      this.popup.style.display = 'none';
      this._visible = false;
      this.currentIcao = null;
    }
  }
}
