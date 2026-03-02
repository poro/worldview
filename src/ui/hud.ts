import * as Cesium from 'cesium';
import { formatUTC, formatLocal } from '../utils/time';
import { formatCoord, formatAltitude } from '../utils/format';
import { FilterMode } from '../filters/manager';
import { MilitaryCategoryCounts } from '../flights/military';

/** Simple lat/lon to MGRS-like grid reference (approximate display) */
function toMGRS(lat: number, lon: number): string {
  // UTM zone
  const zone = Math.floor((lon + 180) / 6) + 1;
  // Band letter
  const bands = 'CDEFGHJKLMNPQRSTUVWX';
  const bandIdx = Math.max(0, Math.min(bands.length - 1, Math.floor((lat + 80) / 8)));
  const band = bands[bandIdx];
  // 100km square letters (simplified — just cycle through letters)
  const col100k = String.fromCharCode(65 + (Math.floor(lon * 10) % 8));
  const row100k = String.fromCharCode(65 + (Math.floor(lat * 10) % 20));
  // Easting/Northing (last 5 digits)
  const easting = Math.abs(Math.round(((lon % 6) + 3) * 11111.1)) % 100000;
  const northing = Math.abs(Math.round((lat % 8) * 11111.1)) % 100000;
  return `${zone}${band} ${col100k}${row100k} ${String(easting).padStart(5, '0').slice(0, 4)} ${String(northing).padStart(5, '0').slice(0, 4)}`;
}

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
    vesselCount: HTMLElement;
    milVesselCount: HTMLElement;
    dataAge: HTMLElement;
    fpsCounter: HTMLElement;
    loadingFlights: HTMLElement;
    loadingSats: HTMLElement;
    loadingQuakes: HTMLElement;
    loadingVessels: HTMLElement;
    milBreakdown: HTMLElement;
    recDot: HTMLElement;
    classificationBanner: HTMLElement;
    mgrsCoords: HTMLElement;
    gsdValue: HTMLElement;
    sunAngle: HTMLElement;
    recTimestamp: HTMLElement;
    orbCounter: HTMLElement;
    passCounter: HTMLElement;
  };
  private cursorLat: number = 0;
  private cursorLon: number = 0;
  private onModeChange: ((mode: 'LIVE' | 'PLAYBACK') => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.container = document.getElementById('ui-overlay')!;
    this.elements = this.build();
    this.bindModeToggle();
    this.startUpdates();
  }

  get visible(): boolean { return this._visible; }

  toggle() {
    this._visible = !this._visible;
    const hudElements = this.container.querySelectorAll('.hud-element');
    hudElements.forEach((el) => {
      (el as HTMLElement).style.display = this._visible ? '' : 'none';
    });
  }

  updateFlightCount(count: number) {
    this.elements.flightCount.textContent = count.toLocaleString();
    this.elements.loadingFlights.style.display = 'none';
    this.animateCount(this.elements.flightCount);
  }

  updateSatCount(count: number) {
    this.elements.satCount.textContent = count.toLocaleString();
    this.elements.loadingSats.style.display = 'none';
    this.animateCount(this.elements.satCount);
  }

  updateMilitaryCount(count: number, categoryCounts?: MilitaryCategoryCounts) {
    this.elements.militaryCount.textContent = count.toLocaleString();
    this.animateCount(this.elements.militaryCount);

    if (categoryCounts) {
      const parts: string[] = [];
      if (categoryCounts.fighter > 0) parts.push(`F:${categoryCounts.fighter}`);
      if (categoryCounts.bomber > 0) parts.push(`B:${categoryCounts.bomber}`);
      if (categoryCounts.tanker > 0) parts.push(`T:${categoryCounts.tanker}`);
      if (categoryCounts.isr > 0) parts.push(`I:${categoryCounts.isr}`);
      if (categoryCounts.transport > 0) parts.push(`C:${categoryCounts.transport}`);
      if (categoryCounts.helicopter > 0) parts.push(`H:${categoryCounts.helicopter}`);
      if (categoryCounts.unknown > 0) parts.push(`?:${categoryCounts.unknown}`);
      this.elements.milBreakdown.textContent = parts.length > 0 ? parts.join(' ') : '';
      this.elements.milBreakdown.style.display = parts.length > 0 ? 'inline' : 'none';
    }
  }

  updateQuakeCount(count: number) {
    this.elements.quakeCount.textContent = count.toLocaleString();
    this.elements.loadingQuakes.style.display = 'none';
    this.animateCount(this.elements.quakeCount);
  }

  updateVesselCount(count: number) {
    this.elements.vesselCount.textContent = count.toLocaleString();
    this.elements.loadingVessels.style.display = 'none';
    this.animateCount(this.elements.vesselCount);
  }

  updateMilitaryVesselCount(count: number) {
    this.elements.milVesselCount.textContent = count.toLocaleString();
    this.animateCount(this.elements.milVesselCount);
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

  setOnModeChange(cb: (mode: 'LIVE' | 'PLAYBACK') => void) {
    this.onModeChange = cb;
  }

  /** Update the mode toggle button states externally */
  setMode(mode: 'LIVE' | 'PLAYBACK') {
    const liveBtn = document.getElementById('mode-live');
    const playbackBtn = document.getElementById('mode-playback');
    if (liveBtn && playbackBtn) {
      if (mode === 'LIVE') {
        liveBtn.style.background = 'rgba(0,255,136,0.2)';
        liveBtn.style.color = '#00ff88';
        liveBtn.style.textShadow = '0 0 6px rgba(0,255,136,0.5)';
        playbackBtn.style.background = 'transparent';
        playbackBtn.style.color = '#666';
        playbackBtn.style.textShadow = 'none';
      } else {
        liveBtn.style.background = 'transparent';
        liveBtn.style.color = '#666';
        liveBtn.style.textShadow = 'none';
        playbackBtn.style.background = 'rgba(255,179,0,0.2)';
        playbackBtn.style.color = '#ffb300';
        playbackBtn.style.textShadow = '0 0 6px rgba(255,179,0,0.5)';
      }
    }
  }

  updateDataAge(ms: number) {
    const sec = Math.floor(ms / 1000);
    this.elements.dataAge.textContent = sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m`;
  }

  private animateCount(el: HTMLElement) {
    el.classList.remove('count-flash');
    void el.offsetWidth;
    el.classList.add('count-flash');
  }

  private build() {
    // Classification banner (top center)
    const banner = this.createElement('hud-element', `
      <div class="text-center" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div class="py-1 px-6" style="background:rgba(255,61,61,0.15);border:1px solid rgba(255,61,61,0.3);border-radius:2px;">
          <span id="hud-classification" class="text-[9px] tracking-[0.25em] text-red-400 font-semibold" style="text-shadow:0 0 6px rgba(255,61,61,0.5)">TOP SECRET // SI-TK // NOFORN</span>
        </div>
        <span class="text-[8px] tracking-[0.15em] text-gray-600">KH11-4063 OPS-4150</span>
      </div>
    `);
    banner.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:60;';
    this.container.appendChild(banner);

    // LIVE/PLAYBACK toggle (top center, below banner)
    const modeToggle = this.createElement('hud-element', `
      <div class="live-playback-toggle" style="display:flex;gap:2px;background:rgba(10,10,15,0.9);border:1px solid rgba(0,255,136,0.2);border-radius:3px;padding:2px;backdrop-filter:blur(8px);">
        <button class="mode-btn active" id="mode-live" style="padding:3px 14px;border:none;border-radius:2px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.15em;cursor:pointer;transition:all 0.15s;background:rgba(0,255,136,0.2);color:#00ff88;text-shadow:0 0 6px rgba(0,255,136,0.5);">LIVE</button>
        <button class="mode-btn" id="mode-playback" style="padding:3px 14px;border:none;border-radius:2px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.15em;cursor:pointer;transition:all 0.15s;background:transparent;color:#666;">PLAYBACK</button>
      </div>
    `);
    modeToggle.style.cssText = 'position:absolute;top:48px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:auto;';
    this.container.appendChild(modeToggle);

    // Top-left: WORLDVIEW branding + time + status
    const topLeft = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-3 rounded-sm pointer-events-auto" style="min-width: 260px">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
          <span class="text-[11px] tracking-[0.3em] text-green-400 glow-green font-semibold">WORLDVIEW</span>
          <span class="text-[9px] text-gray-600 ml-auto">v1.0</span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <div class="w-[5px] h-[5px] rounded-full bg-green-400" style="box-shadow:0 0 4px #00ff88;"></div>
          <span class="text-[9px] tracking-[0.1em] text-green-400">STATUS: NORMAL</span>
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
    topLeft.style.cssText = 'position:absolute;top:36px;left:16px;';
    this.container.appendChild(topLeft);

    // Top-right: REC indicator + Filter + camera + counters
    const topRight = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-3 rounded-sm pointer-events-auto" style="min-width: 220px">
        <div class="flex items-center gap-2 mb-2">
          <div id="hud-rec-dot" class="w-2 h-2 rounded-full bg-red-500 pulse-dot" style="animation:rec-blink 1s infinite"></div>
          <span class="text-[10px] tracking-[0.2em] text-red-400 font-semibold">REC</span>
          <span class="text-[9px] text-red-400/60 ml-1" id="hud-rec-timestamp">--:--:--Z</span>
          <span class="text-[9px] text-gray-600 ml-auto" id="hud-filter">STANDARD</span>
        </div>
        <div class="border-t border-gray-800/50 pt-2 space-y-1">
          <div class="flex justify-between">
            <span class="data-label">CAM ALT</span>
            <span class="data-value text-xs" id="hud-cam-alt">---</span>
          </div>
          <div class="flex justify-between">
            <span class="data-label">CURSOR</span>
            <span class="data-value text-xs" id="hud-mouse-coords">---</span>
          </div>
          <div class="flex justify-between mt-1">
            <span class="data-label">ORB</span>
            <span class="data-value text-xs text-cyan-400" id="hud-orb">---</span>
          </div>
          <div class="flex justify-between">
            <span class="data-label">PASS</span>
            <span class="data-value text-xs text-cyan-400" id="hud-pass">---</span>
          </div>
        </div>
      </div>
    `);
    topRight.style.cssText = 'position:absolute;top:36px;right:16px;';
    this.container.appendChild(topRight);

    // Bottom-left: MGRS coordinates
    const bottomLeft = this.createElement('hud-element', `
      <div class="cmd-panel px-3 py-2 rounded-sm pointer-events-auto" style="min-width:200px;">
        <div class="flex justify-between">
          <span class="data-label">MGRS</span>
          <span class="data-value text-xs text-green-400" id="hud-mgrs" style="font-family:'JetBrains Mono',monospace;letter-spacing:0.08em;">--- -- ---- ----</span>
        </div>
      </div>
    `);
    bottomLeft.style.cssText = 'position:absolute;bottom:80px;left:16px;';
    this.container.appendChild(bottomLeft);

    // Bottom-right: GSD + Sun angle
    const bottomRight = this.createElement('hud-element', `
      <div class="cmd-panel px-3 py-2 rounded-sm pointer-events-auto" style="min-width:160px;">
        <div class="flex justify-between">
          <span class="data-label">GSD</span>
          <span class="data-value text-xs" id="hud-gsd">---</span>
        </div>
        <div class="flex justify-between">
          <span class="data-label">SUN EL</span>
          <span class="data-value text-xs" id="hud-sun-angle">---</span>
        </div>
      </div>
    `);
    bottomRight.style.cssText = 'position:absolute;bottom:80px;right:80px;';
    this.container.appendChild(bottomRight);

    // Bottom bar: stats with loading indicators
    const bottomBar = this.createElement('hud-element', `
      <div class="cmd-panel px-4 py-2 rounded-sm pointer-events-auto flex items-center gap-4 flex-wrap justify-center">
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2"><path d="M12 2L8 10H2L4 13H8L10 22H14L12 13H20L22 10H16L12 2Z"/></svg>
          <span class="data-label mr-1">FLIGHTS</span>
          <span class="text-green-400 text-xs font-medium stat-value" id="hud-flights">0</span>
          <span class="loading-indicator text-[9px] text-gray-500 animate-pulse" id="loading-flights">LOADING...</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#ff4500" stroke-width="1.5"><polygon points="8,1 14,8 8,15 2,8"/></svg>
          <span class="data-label mr-1">MIL</span>
          <span class="text-orange-400 text-xs font-medium stat-value" id="hud-military">0</span>
          <span class="text-[8px] text-gray-600 ml-1" id="hud-mil-breakdown" style="display:none"></span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span class="data-label mr-1">SATS</span>
          <span class="text-cyan-400 text-xs font-medium stat-value" id="hud-sats">0</span>
          <span class="loading-indicator text-[9px] text-gray-500 animate-pulse" id="loading-sats">LOADING...</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-red-400"></div>
          <span class="data-label mr-1">QUAKES</span>
          <span class="text-red-400 text-xs font-medium stat-value" id="hud-quakes">0</span>
          <span class="loading-indicator text-[9px] text-gray-500 animate-pulse" id="loading-quakes">LOADING...</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1.5"><path d="M12 3L7 12L4 20L12 17L20 20L17 12L12 3Z"/></svg>
          <span class="data-label mr-1">SHIPS</span>
          <span class="text-gray-400 text-xs font-medium stat-value" id="hud-vessels">0</span>
          <span class="loading-indicator text-[9px] text-gray-500 animate-pulse" id="loading-vessels">LOADING...</span>
        </div>
        <div class="w-px h-4 bg-gray-800"></div>
        <div class="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff3d3d" stroke-width="1.5"><path d="M12 2L4 8L4 16L12 22L20 16L20 8Z"/></svg>
          <span class="data-label mr-1">NAV MIL</span>
          <span class="text-red-400 text-xs font-medium stat-value" id="hud-mil-vessels">0</span>
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
    bottomBar.style.cssText = 'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 32px);';
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
      vesselCount: document.getElementById('hud-vessels')!,
      milVesselCount: document.getElementById('hud-mil-vessels')!,
      dataAge: document.getElementById('hud-data-age')!,
      fpsCounter: document.getElementById('hud-fps')!,
      loadingFlights: document.getElementById('loading-flights')!,
      loadingSats: document.getElementById('loading-sats')!,
      loadingQuakes: document.getElementById('loading-quakes')!,
      loadingVessels: document.getElementById('loading-vessels')!,
      milBreakdown: document.getElementById('hud-mil-breakdown')!,
      recDot: document.getElementById('hud-rec-dot')!,
      classificationBanner: document.getElementById('hud-classification')!,
      mgrsCoords: document.getElementById('hud-mgrs')!,
      gsdValue: document.getElementById('hud-gsd')!,
      sunAngle: document.getElementById('hud-sun-angle')!,
      recTimestamp: document.getElementById('hud-rec-timestamp')!,
      orbCounter: document.getElementById('hud-orb')!,
      passCounter: document.getElementById('hud-pass')!,
    };
  }

  private bindModeToggle() {
    const liveBtn = document.getElementById('mode-live');
    const playbackBtn = document.getElementById('mode-playback');
    liveBtn?.addEventListener('click', () => {
      this.setMode('LIVE');
      this.onModeChange?.('LIVE');
    });
    playbackBtn?.addEventListener('click', () => {
      this.setMode('PLAYBACK');
      this.onModeChange?.('PLAYBACK');
    });
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
    let orbCount = 0;

    const update = () => {
      const now = new Date();
      this.elements.utcTime.textContent = formatUTC(now);
      this.elements.localTime.textContent = formatLocal(now);
      this.elements.recTimestamp.textContent = formatUTC(now);

      // Camera altitude
      const camPos = this.viewer.camera.positionCartographic;
      const camHeight = camPos.height;
      this.elements.cameraAlt.textContent = formatAltitude(camHeight);

      // GSD — approximate ground sample distance from camera height
      // GSD (m/px) ≈ altitude(m) * pixel_size / focal_length → simplified
      const gsdMeters = camHeight * 0.00001; // rough approximation
      if (gsdMeters < 1) {
        this.elements.gsdValue.textContent = `${(gsdMeters * 100).toFixed(1)} cm/px`;
      } else if (gsdMeters < 1000) {
        this.elements.gsdValue.textContent = `${gsdMeters.toFixed(1)} m/px`;
      } else {
        this.elements.gsdValue.textContent = `${(gsdMeters / 1000).toFixed(1)} km/px`;
      }

      // Sun elevation angle (approximate from Cesium sun position)
      try {
        const julianDate = Cesium.JulianDate.fromDate(now);
        const sunPos = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(julianDate);
        const cameraCart = this.viewer.camera.positionWC;
        if (sunPos && cameraCart) {
          const sunDir = Cesium.Cartesian3.normalize(sunPos, new Cesium.Cartesian3());
          const camDir = Cesium.Cartesian3.normalize(cameraCart, new Cesium.Cartesian3());
          const dot = Cesium.Cartesian3.dot(sunDir, camDir);
          const sunElev = Cesium.Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, dot))));
          this.elements.sunAngle.textContent = `${sunElev.toFixed(1)}°`;
        }
      } catch {
        // Sun computation not critical
      }

      // MGRS from cursor position
      if (this.cursorLat !== 0 || this.cursorLon !== 0) {
        this.elements.mgrsCoords.textContent = toMGRS(this.cursorLat, this.cursorLon);
      }

      // ORB/PASS counters (simulated — increment slowly)
      orbCount += 0.001;
      this.elements.orbCounter.textContent = Math.floor(orbCount + 4150).toString();
      this.elements.passCounter.textContent = Math.floor(orbCount * 2.3 + 12).toString();

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
        this.cursorLat = Cesium.Math.toDegrees(carto.latitude);
        this.cursorLon = Cesium.Math.toDegrees(carto.longitude);
        this.elements.mouseCoords.textContent = formatCoord(this.cursorLat, this.cursorLon);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    requestAnimationFrame(update);
  }
}
