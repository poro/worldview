import * as Cesium from 'cesium';
import { formatUTC, formatLocal } from '../utils/time';
import { formatCoord, formatAltitude } from '../utils/format';
import { FilterMode } from '../filters/manager';

export class HUD {
  private container: HTMLElement;
  private viewer: Cesium.Viewer;
  private _visible: boolean = true;
  private elements: {
    utcTime: HTMLElement;
    localTime: HTMLElement;
    mouseCoords: HTMLElement;
    cameraAlt: HTMLElement;
    filterMode: HTMLElement;
    flightCount: HTMLElement;
    militaryCount: HTMLElement;
    satCount: HTMLElement;
    quakeCount: HTMLElement;
    dataAge: HTMLElement;
    fpsCounter: HTMLElement;
  };

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.container = document.getElementById('ui-overlay')!;
    this.elements = this.build();
    this.startUpdates();
  }

  get visible(): boolean {
    return this._visible;
  }

  toggle() {
    this._visible = !this._visible;
    const hudElements = this.container.querySelectorAll('.hud-element');
    hudElements.forEach((el) => {
      (el as HTMLElement).style.display = this._visible ? '' : 'none';
    });
  }

  updateFlightCount(count: number) {
    this.elements.flightCount.textContent = count.toLocaleString();
  }

  updateSatCount(count: number) {
    this.elements.satCount.textContent = count.toLocaleString();
  }

  updateMilitaryCount(count: number) {
    this.elements.militaryCount.textContent = count.toLocaleString();
  }

  updateQuakeCount(count: number) {
    this.elements.quakeCount.textContent = count.toLocaleString();
  }

  updateFilter(mode: FilterMode) {
    const names: Record<FilterMode, string> = {
      normal: 'STANDARD',
      nightvision: 'NV',
      flir: 'FLIR',
      crt: 'CRT',
      enhanced: 'ENH',
    };
    this.elements.filterMode.textContent = names[mode];
  }

  updateDataAge(ms: number) {
    const sec = Math.floor(ms / 1000);
    this.elements.dataAge.textContent = sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m`;
  }

  private build() {
    // Top-left: WORLDVIEW branding + time
    const topLeft = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-3 rounded-sm pointer-events-auto" style="min-width: 260px">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
          <span class="text-[11px] tracking-[0.3em] text-green-400 glow-green font-semibold">WORLDVIEW</span>
          <span class="text-[9px] text-gray-600 ml-auto">v1.0</span>
        </div>
        <div class="border-t border-gray-800/50 pt-2 space-y-1">
          <div class="flex justify-between">
            <span class="data-label">UTC</span>
            <span class="data-value text-green-400 glow-green text-xs" id="hud-utc">--:--:--Z</span>
          </div>
          <div class="flex justify-between">
            <span class="data-label">LOCAL</span>
            <span class="data-value text-xs" id="hud-local">--:--:--</span>
          </div>
        </div>
      </div>
    `);
    topLeft.style.cssText = 'position:absolute;top:16px;left:16px;';
    this.container.appendChild(topLeft);

    // Top-right: Filter + camera
    const topRight = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-3 rounded-sm pointer-events-auto" style="min-width: 200px">
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="data-label">FILTER</span>
            <span class="data-value text-cyan-400 glow-cyan text-xs" id="hud-filter">STANDARD</span>
          </div>
          <div class="flex justify-between">
            <span class="data-label">CAM ALT</span>
            <span class="data-value text-xs" id="hud-cam-alt">---</span>
          </div>
          <div class="flex justify-between">
            <span class="data-label">CURSOR</span>
            <span class="data-value text-xs" id="hud-mouse-coords">---</span>
          </div>
        </div>
      </div>
    `);
    topRight.style.cssText = 'position:absolute;top:16px;right:16px;';
    this.container.appendChild(topRight);

    // Bottom bar: stats
    const bottomBar = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-2 rounded-sm pointer-events-auto flex items-center gap-6">
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2"><path d="M12 2L8 10H2L4 13H8L10 22H14L12 13H20L22 10H16L12 2Z"/></svg>
          <span class="data-label mr-1">FLIGHTS</span>
          <span class="text-green-400 text-xs font-medium" id="hud-flights">0</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#ff4500" stroke-width="1.5"><polygon points="8,1 14,8 8,15 2,8"/></svg>
          <span class="data-label mr-1">MIL</span>
          <span class="text-orange-400 text-xs font-medium" id="hud-military">0</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span class="data-label mr-1">SATS</span>
          <span class="text-cyan-400 text-xs font-medium" id="hud-sats">0</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-red-400"></div>
          <span class="data-label mr-1">QUAKES</span>
          <span class="text-red-400 text-xs font-medium" id="hud-quakes">0</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <span class="data-label mr-1">DATA</span>
          <span class="text-xs text-gray-400" id="hud-data-age">--</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <span class="data-label mr-1">FPS</span>
          <span class="text-xs text-gray-400" id="hud-fps">--</span>
        </div>
      </div>
    `);
    bottomBar.style.cssText = 'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);';
    this.container.appendChild(bottomBar);

    // Crosshair
    const crosshair = this.createElement('hud-element', `
      <div class="relative" style="width:24px;height:24px">
        <div class="absolute inset-0 border border-green-400/20 rounded-full"></div>
        <div class="absolute top-1/2 left-0 w-full h-px bg-green-400/15"></div>
        <div class="absolute left-1/2 top-0 h-full w-px bg-green-400/15"></div>
        <div class="absolute top-1/2 left-1/2 w-1 h-1 -mt-0.5 -ml-0.5 bg-green-400/40 rounded-full"></div>
      </div>
    `);
    crosshair.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);';
    this.container.appendChild(crosshair);

    return {
      utcTime: document.getElementById('hud-utc')!,
      localTime: document.getElementById('hud-local')!,
      mouseCoords: document.getElementById('hud-mouse-coords')!,
      cameraAlt: document.getElementById('hud-cam-alt')!,
      filterMode: document.getElementById('hud-filter')!,
      flightCount: document.getElementById('hud-flights')!,
      militaryCount: document.getElementById('hud-military')!,
      satCount: document.getElementById('hud-sats')!,
      quakeCount: document.getElementById('hud-quakes')!,
      dataAge: document.getElementById('hud-data-age')!,
      fpsCounter: document.getElementById('hud-fps')!,
    };
  }

  private createElement(className: string, html: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.innerHTML = html;
    return el;
  }

  private startUpdates() {
    let lastTime = performance.now();
    let frames = 0;

    const update = () => {
      const now = new Date();
      this.elements.utcTime.textContent = formatUTC(now);
      this.elements.localTime.textContent = formatLocal(now);

      // Camera altitude
      const camPos = this.viewer.camera.positionCartographic;
      this.elements.cameraAlt.textContent = formatAltitude(camPos.height);

      // FPS
      frames++;
      const elapsed = performance.now() - lastTime;
      if (elapsed >= 1000) {
        this.elements.fpsCounter.textContent = Math.round(frames * 1000 / elapsed).toString();
        frames = 0;
        lastTime = performance.now();
      }

      requestAnimationFrame(update);
    };

    // Mouse tracking
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition);
      if (!ray) return;
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        this.elements.mouseCoords.textContent = formatCoord(
          Cesium.Math.toDegrees(carto.latitude),
          Cesium.Math.toDegrees(carto.longitude)
        );
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    requestAnimationFrame(update);
  }
}
