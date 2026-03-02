import { FlightState } from '../flights/types';
import { MilitaryFlightInfo } from '../flights/tracker';
import { MILITARY_CATEGORY_COLORS } from '../flights/military';
import { SatellitePosition } from '../satellites/propagator';
import { Earthquake } from '../osint/earthquakes';
import { Vessel } from '../maritime/types';
import { formatAltitude, formatSpeed, formatHeading, formatCoord } from '../utils/format';

export class DetailPanel {
  private panel: HTMLElement;
  private content: HTMLElement;
  private _visible: boolean = false;
  private onClose: (() => void) | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.className = 'hud-element';
    this.panel.style.cssText = 'position:absolute;top:80px;left:16px;width:300px;max-height:calc(100vh - 120px);overflow-y:auto;display:none;z-index:100;';
    this.panel.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
          <span class="text-[10px] tracking-widest text-gray-500 uppercase" id="panel-title">DETAILS</span>
          <button class="text-gray-500 hover:text-green-400 text-xs transition-colors" id="panel-close">\u2715</button>
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

  showFlight(flight: FlightState, milInfo?: MilitaryFlightInfo) {
    const isMil = milInfo?.classification?.isMilitary;
    const titleText = isMil ? 'MILITARY AIRCRAFT' : 'AIRCRAFT';
    document.getElementById('panel-title')!.textContent = titleText;

    let milSection = '';
    if (isMil && milInfo) {
      const cls = milInfo.classification;
      const catColor = MILITARY_CATEGORY_COLORS[cls.category];
      const squawkHtml = milInfo.squawkAlert
        ? `<div class="mt-2 px-2 py-1.5 rounded-sm border ${milInfo.squawkAlert.severity === 'emergency' ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'}">
            <div class="text-[10px] tracking-wider ${milInfo.squawkAlert.severity === 'emergency' ? 'text-red-400' : 'text-amber-400'} font-semibold">
              SQUAWK ${milInfo.squawkAlert.code} — ${milInfo.squawkAlert.meaning}
            </div>
          </div>`
        : '';

      milSection = `
        <div class="border-t border-gray-800/50 pt-2">
          <div class="data-label mb-1" style="color:${catColor}">CLASSIFICATION</div>
          <div class="grid grid-cols-2 gap-y-2 gap-x-4">
            ${this.dataRow('TYPE', cls.typeName)}
            ${this.dataRow('CATEGORY', cls.category.toUpperCase())}
            ${this.dataRow('MISSION', cls.probableMission)}
            ${cls.baseHint ? this.dataRow('BASE', cls.baseHint) : ''}
          </div>
          ${squawkHtml}
        </div>
      `;
    }

    this.content.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="${isMil ? '' : 'text-green-400 glow-green'} text-lg font-semibold tracking-wide" ${isMil ? `style="color:${MILITARY_CATEGORY_COLORS[milInfo!.classification.category]}"` : ''}>${flight.callsign || 'N/A'}</div>
          <div class="text-[10px] text-gray-500">${flight.icao24.toUpperCase()} \u00b7 ${flight.originCountry}</div>
        </div>
        ${milSection}
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('ALTITUDE', formatAltitude(flight.baroAltitude))}
          ${this.dataRow('SPEED', formatSpeed(flight.velocity))}
          ${this.dataRow('HEADING', formatHeading(flight.trueTrack))}
          ${this.dataRow('VERT RATE', flight.verticalRate ? `${flight.verticalRate > 0 ? '\u25B2' : '\u25BC'} ${Math.abs(flight.verticalRate).toFixed(1)} m/s` : '---')}
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
          <div class="text-[10px] text-gray-500">NORAD ${sat.noradId} \u00b7 ${sat.category.toUpperCase()}</div>
        </div>
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('ALTITUDE', `${sat.alt.toFixed(1)} km`)}
          ${this.dataRow('VELOCITY', `${sat.velocity.toFixed(2)} km/s`)}
          ${this.dataRow('INCL', `${sat.inclination.toFixed(1)}\u00b0`)}
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

  showVessel(vessel: Vessel) {
    document.getElementById('panel-title')!.textContent = vessel.isMilitary ? 'MILITARY VESSEL' : 'VESSEL';

    const typeColors: Record<string, string> = {
      cargo: '#808080',
      tanker: '#4dabf7',
      passenger: '#ffffff',
      fishing: '#00e5ff',
      military: '#ff3d3d',
      tug: '#ffb300',
      pleasure: '#b388ff',
      other: '#666666',
    };
    const typeColor = typeColors[vessel.type] || '#808080';

    this.content.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-lg font-semibold tracking-wide" style="color:${typeColor}">${vessel.name || 'UNKNOWN'}</div>
          <div class="text-[10px] text-gray-500">MMSI ${vessel.mmsi} \u00b7 ${vessel.type.toUpperCase()}${vessel.flag ? ` \u00b7 ${vessel.flag}` : ''}</div>
        </div>
        <div class="border-t border-gray-800/50 pt-2 grid grid-cols-2 gap-y-2 gap-x-4">
          ${this.dataRow('SPEED', vessel.speed > 0 ? `${vessel.speed.toFixed(1)} kts` : '---')}
          ${this.dataRow('HEADING', vessel.heading > 0 ? `${Math.round(vessel.heading)}\u00b0` : '---')}
          ${this.dataRow('COURSE', vessel.course > 0 ? `${Math.round(vessel.course)}\u00b0` : '---')}
          ${this.dataRow('DESTINATION', vessel.destination || '---')}
          ${vessel.length > 0 ? this.dataRow('LENGTH', `${vessel.length} m`) : ''}
          ${vessel.draught > 0 ? this.dataRow('DRAUGHT', `${vessel.draught.toFixed(1)} m`) : ''}
        </div>
        <div class="border-t border-gray-800/50 pt-2">
          ${this.dataRow('POSITION', formatCoord(vessel.latitude, vessel.longitude))}
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
