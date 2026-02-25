import { FlightState } from '../flights/types';
import { SatellitePosition } from '../satellites/propagator';
import { Earthquake } from '../osint/earthquakes';
import { formatAltitude, formatSpeed, formatHeading, formatCoord } from '../utils/format';

export class DetailPanel {
  private panel: HTMLElement;
  private content: HTMLElement;
  private _visible: boolean = false;
  private onClose: (() => void) | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.className = 'hud-element';
    this.panel.style.cssText = 'position:absolute;top:80px;right:16px;width:300px;max-height:calc(100vh - 120px);overflow-y:auto;display:none;';
    this.panel.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
          <span class="text-[10px] tracking-widest text-gray-500 uppercase" id="panel-title">DETAILS</span>
          <button class="text-gray-500 hover:text-green-400 text-xs transition-colors" id="panel-close">✕</button>
        </div>
        <div id="panel-content" class="px-4 py-3 space-y-2"></div>
      </div>
    `;

    document.getElementById('ui-overlay')!.appendChild(this.panel);
    this.content = document.getElementById('panel-content')!;

    document.getElementById('panel-close')!.addEventListener('click', () => {
      this.hide();
      this.onClose?.();
    });
  }

  get visible(): boolean {
    return this._visible;
  }

  setOnClose(cb: () => void) {
    this.onClose = cb;
  }

  showFlight(flight: FlightState) {
    document.getElementById('panel-title')!.textContent = 'AIRCRAFT';
    this.content.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-green-400 glow-green text-lg font-semibold tracking-wide">${flight.callsign || 'N/A'}</div>
          <div class="text-[10px] text-gray-500">${flight.icao24.toUpperCase()} · ${flight.originCountry}</div>
        </div>
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('ALTITUDE', formatAltitude(flight.baroAltitude))}
          ${this.dataRow('SPEED', formatSpeed(flight.velocity))}
          ${this.dataRow('HEADING', formatHeading(flight.trueTrack))}
          ${this.dataRow('VERT RATE', flight.verticalRate ? `${flight.verticalRate > 0 ? '▲' : '▼'} ${Math.abs(flight.verticalRate).toFixed(1)} m/s` : '---')}
          ${this.dataRow('GEO ALT', formatAltitude(flight.geoAltitude))}
          ${this.dataRow('SQUAWK', flight.squawk || '---')}
        </div>
        ${flight.latitude !== null && flight.longitude !== null ? `
          <div class="border-t border-gray-800/50 pt-2">
            ${this.dataRow('POSITION', formatCoord(flight.latitude, flight.longitude))}
          </div>
        ` : ''}
      </div>
    `;
    this.show();
  }

  showSatellite(sat: SatellitePosition) {
    document.getElementById('panel-title')!.textContent = 'SATELLITE';
    const catColors: Record<string, string> = {
      stations: 'text-red-400',
      starlink: 'text-blue-400',
      military: 'text-amber-400',
      weather: 'text-cyan-400',
      gps: 'text-green-400',
    };
    const colorClass = catColors[sat.category] || 'text-green-400';

    this.content.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="${colorClass} text-lg font-semibold tracking-wide">${sat.name}</div>
          <div class="text-[10px] text-gray-500">NORAD ${sat.noradId} · ${sat.category.toUpperCase()}</div>
        </div>
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('ALTITUDE', `${sat.alt.toFixed(1)} km`)}
          ${this.dataRow('VELOCITY', `${sat.velocity.toFixed(2)} km/s`)}
          ${this.dataRow('INCL', `${sat.inclination.toFixed(1)}°`)}
          ${this.dataRow('POSITION', formatCoord(sat.lat, sat.lon))}
        </div>
      </div>
    `;
    this.show();
  }

  showEarthquake(eq: Earthquake) {
    document.getElementById('panel-title')!.textContent = 'SEISMIC EVENT';
    const date = new Date(eq.time);
    this.content.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-red-400 glow-red text-lg font-semibold">M${eq.magnitude.toFixed(1)}</div>
          <div class="text-xs text-gray-400">${eq.place}</div>
        </div>
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('TIME', date.toISOString().substring(0, 19) + 'Z')}
          ${this.dataRow('DEPTH', `${eq.depth.toFixed(1)} km`)}
          ${this.dataRow('POSITION', formatCoord(eq.lat, eq.lon))}
        </div>
      </div>
    `;
    this.show();
  }

  hide() {
    this.panel.style.display = 'none';
    this._visible = false;
  }

  private show() {
    this.panel.style.display = 'block';
    this._visible = true;
  }

  private dataRow(label: string, value: string): string {
    return `
      <div>
        <div class="data-label">${label}</div>
        <div class="data-value">${value}</div>
      </div>
    `;
  }
}
