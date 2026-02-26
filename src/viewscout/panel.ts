import * as Cesium from 'cesium';
import { computeViewshed, getElevationProfile, ViewshedResult } from './compute';
import { detectWaterVisibility, WaterVisibility } from './water';
import { computeViewScore, ViewScore } from './score';
import { renderViewshedOverlay, clearOverlay } from './overlay';
import { renderElevationChart } from './elevation';

export interface ViewScoutCallbacks {
  onToggle: (active: boolean) => void;
}

const OBSERVER_HEIGHTS = [
  { label: 'GROUND', value: 1.7 },
  { label: '1 STORY', value: 4 },
  { label: '2 STORY', value: 7 },
  { label: '3 STORY', value: 10 },
  { label: '4 STORY', value: 13 },
];

export class ViewScoutPanel {
  private viewer: Cesium.Viewer;
  private panel: HTMLElement;
  private active = false;
  private observerHeightIdx = 1; // default: 1 story
  private lastResult: ViewshedResult | null = null;
  private clickHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private callbacks: ViewScoutCallbacks;

  constructor(viewer: Cesium.Viewer, callbacks: ViewScoutCallbacks) {
    this.viewer = viewer;
    this.callbacks = callbacks;
    this.panel = this.buildPanel();
    document.getElementById('ui-overlay')!.appendChild(this.panel);
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    this.active = !this.active;
    this.panel.style.transform = this.active ? 'translateX(0)' : 'translateX(100%)';

    if (this.active) {
      this.enableClickMode();
    } else {
      this.disableClickMode();
      clearOverlay(this.viewer);
    }

    this.callbacks.onToggle(this.active);
  }

  private enableClickMode(): void {
    if (this.clickHandler) return;
    this.clickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.clickHandler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      if (!this.active) return;
      const ray = this.viewer.camera.getPickRay(click.position);
      if (!ray) return;
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian) return;
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(carto.longitude);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      this.runAnalysis(lon, lat);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  private disableClickMode(): void {
    if (this.clickHandler) {
      this.clickHandler.destroy();
      this.clickHandler = null;
    }
  }

  async runAnalysis(lon: number, lat: number): Promise<void> {
    const height = OBSERVER_HEIGHTS[this.observerHeightIdx].value;
    this.setLoading(true);

    try {
      // Ensure globe is visible for terrain sampling
      const globeWasHidden = !this.viewer.scene.globe.show;
      if (globeWasHidden) this.viewer.scene.globe.show = true;

      const result = await computeViewshed(lon, lat, height, 10000, 72, 40);
      const water = detectWaterVisibility(result);
      const score = computeViewScore(result, water);

      this.lastResult = result;

      renderViewshedOverlay(this.viewer, result);
      this.updateResults(result, water, score);

      if (globeWasHidden) this.viewer.scene.globe.show = false;
    } catch (err) {
      console.error('[ViewScout] Analysis failed:', err);
      this.setError('Analysis failed — terrain data unavailable');
    } finally {
      this.setLoading(false);
    }
  }

  async runElevationProfile(toLon: number, toLat: number): Promise<void> {
    if (!this.lastResult) return;

    try {
      const profile = await getElevationProfile(
        this.lastResult.observerLon, this.lastResult.observerLat,
        toLon, toLat, 50,
      );

      const canvas = this.panel.querySelector('#vs-elev-canvas') as HTMLCanvasElement;
      if (canvas) {
        renderElevationChart(canvas, profile, this.lastResult.observerHeight);
        (this.panel.querySelector('#vs-elev-section') as HTMLElement).style.display = 'block';
      }
    } catch (err) {
      console.error('[ViewScout] Elevation profile failed:', err);
    }
  }

  private buildPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'hud-element';
    el.style.cssText = `
      position: absolute; top: 0; right: 0; bottom: 0; width: 340px;
      transform: translateX(100%); transition: transform 0.3s ease;
      z-index: 100; pointer-events: auto;
    `;

    el.innerHTML = `
      <div class="cmd-panel h-full overflow-y-auto" style="border-left: 1px solid rgba(0,255,136,0.2);">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
          <div class="flex items-center gap-2">
            <span class="text-green-400 glow-green text-sm font-bold tracking-widest">⊕ VIEWSCOUT</span>
          </div>
          <button id="vs-close" class="text-gray-500 hover:text-green-400 text-xs transition-colors">✕</button>
        </div>

        <!-- Coordinate Input -->
        <div class="px-4 py-3 border-b border-gray-800/50 space-y-2">
          <span class="data-label text-[10px] tracking-widest text-gray-500">COORDINATES / ADDRESS</span>
          <div class="flex gap-2">
            <input id="vs-coord-input" type="text" placeholder="lat, lon or address"
              class="flex-1 bg-gray-900/60 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 font-mono focus:border-green-400/50 focus:outline-none" />
            <button id="vs-coord-go" class="px-3 py-1.5 bg-green-400/10 border border-green-400/30 rounded text-[10px] text-green-400 tracking-wider hover:bg-green-400/20 transition-colors">GO</button>
          </div>
          <div class="text-[9px] text-gray-600">Click globe or enter coordinates to analyze</div>
        </div>

        <!-- Observer Height -->
        <div class="px-4 py-3 border-b border-gray-800/50">
          <span class="data-label text-[10px] tracking-widest text-gray-500">OBSERVER HEIGHT</span>
          <div class="flex gap-1 mt-2" id="vs-height-btns">
            ${OBSERVER_HEIGHTS.map((h, i) => `
              <button class="vs-height-btn px-2 py-1 text-[9px] tracking-wider border rounded-sm transition-all
                ${i === 1 ? 'border-green-400/50 text-green-400 bg-green-400/10' : 'border-gray-700/50 text-gray-500 hover:border-green-400/30'}"
                data-idx="${i}">${h.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- Loading -->
        <div id="vs-loading" class="px-4 py-8 text-center hidden">
          <div class="text-green-400 glow-green text-xs tracking-widest animate-pulse">COMPUTING VIEWSHED...</div>
          <div class="text-[9px] text-gray-600 mt-2">Sampling terrain elevation data</div>
        </div>

        <!-- Error -->
        <div id="vs-error" class="px-4 py-4 text-center hidden">
          <div class="text-red-400 glow-red text-xs" id="vs-error-msg"></div>
        </div>

        <!-- Results -->
        <div id="vs-results" class="hidden">
          <!-- ViewScore -->
          <div class="px-4 py-3 border-b border-gray-800/50">
            <div class="flex items-center justify-between">
              <span class="data-label text-[10px] tracking-widest text-gray-500">VIEWSCORE</span>
              <span id="vs-score-total" class="text-2xl font-bold text-green-400 glow-green">--</span>
            </div>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between text-[9px]">
                <span class="text-gray-500">Terrain Visibility</span>
                <span id="vs-score-terrain" class="text-gray-400">--/30</span>
              </div>
              <div class="w-full h-1 bg-gray-800 rounded"><div id="vs-bar-terrain" class="h-full bg-green-400/60 rounded" style="width:0%"></div></div>
              <div class="flex justify-between text-[9px]">
                <span class="text-gray-500">Water Visibility</span>
                <span id="vs-score-water" class="text-gray-400">--/30</span>
              </div>
              <div class="w-full h-1 bg-gray-800 rounded"><div id="vs-bar-water" class="h-full bg-cyan-400/60 rounded" style="width:0%"></div></div>
              <div class="flex justify-between text-[9px]">
                <span class="text-gray-500">Elevation Advantage</span>
                <span id="vs-score-elev" class="text-gray-400">--/20</span>
              </div>
              <div class="w-full h-1 bg-gray-800 rounded"><div id="vs-bar-elev" class="h-full bg-amber-400/60 rounded" style="width:0%"></div></div>
              <div class="flex justify-between text-[9px]">
                <span class="text-gray-500">View Distance</span>
                <span id="vs-score-dist" class="text-gray-400">--/20</span>
              </div>
              <div class="w-full h-1 bg-gray-800 rounded"><div id="vs-bar-dist" class="h-full bg-purple-400/60 rounded" style="width:0%"></div></div>
            </div>
          </div>

          <!-- Location Info -->
          <div class="px-4 py-3 border-b border-gray-800/50 grid grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <div class="text-[9px] text-gray-600">POSITION</div>
              <div id="vs-position" class="text-[10px] text-gray-300 font-mono">--</div>
            </div>
            <div>
              <div class="text-[9px] text-gray-600">TERRAIN ELEV</div>
              <div id="vs-terrain-elev" class="text-[10px] text-gray-300 font-mono">--</div>
            </div>
            <div>
              <div class="text-[9px] text-gray-600">OBSERVER ELEV</div>
              <div id="vs-obs-elev" class="text-[10px] text-gray-300 font-mono">--</div>
            </div>
            <div>
              <div class="text-[9px] text-gray-600">VISIBLE AREA</div>
              <div id="vs-visible-pct" class="text-[10px] text-gray-300 font-mono">--</div>
            </div>
          </div>

          <!-- Water Detection -->
          <div class="px-4 py-3 border-b border-gray-800/50">
            <span class="data-label text-[10px] tracking-widest text-gray-500">WATER DETECTION</span>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-500">Ocean Visible</span>
                <span id="vs-water-visible" class="font-mono">--</span>
              </div>
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-500">Classification</span>
                <span id="vs-water-class" class="text-gray-300 font-mono">--</span>
              </div>
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-500">Arc Degrees</span>
                <span id="vs-water-arc" class="text-gray-300 font-mono">--</span>
              </div>
              <div class="flex justify-between text-[10px]">
                <span class="text-gray-500">Nearest Water</span>
                <span id="vs-water-dist" class="text-gray-300 font-mono">--</span>
              </div>
            </div>
          </div>

          <!-- Elevation Profile -->
          <div id="vs-elev-section" class="px-4 py-3 border-b border-gray-800/50" style="display:none">
            <canvas id="vs-elev-canvas" width="308" height="150" style="width:100%;border-radius:4px;"></canvas>
          </div>

          <!-- Clear Button -->
          <div class="px-4 py-3">
            <button id="vs-clear" class="w-full py-2 bg-red-400/10 border border-red-400/30 rounded text-[10px] text-red-400 tracking-wider hover:bg-red-400/20 transition-colors">CLEAR ANALYSIS</button>
          </div>
        </div>
      </div>
    `;

    // Wire events after DOM insertion (use setTimeout to ensure it's in DOM)
    setTimeout(() => {
      el.querySelector('#vs-close')?.addEventListener('click', () => this.toggle());

      el.querySelector('#vs-coord-go')?.addEventListener('click', () => this.handleCoordInput());
      (el.querySelector('#vs-coord-input') as HTMLInputElement)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleCoordInput();
      });

      el.querySelectorAll('.vs-height-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.idx || '1');
          this.setObserverHeight(idx);
        });
      });

      el.querySelector('#vs-clear')?.addEventListener('click', () => {
        clearOverlay(this.viewer);
        (el.querySelector('#vs-results') as HTMLElement).classList.add('hidden');
        (el.querySelector('#vs-elev-section') as HTMLElement).style.display = 'none';
        this.lastResult = null;
      });
    }, 0);

    return el;
  }

  private handleCoordInput(): void {
    const input = this.panel.querySelector('#vs-coord-input') as HTMLInputElement;
    const q = input.value.trim();
    if (!q) return;

    // Try lat, lon
    const match = q.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 5000),
        duration: 1.5,
      });
      this.runAnalysis(lon, lat);
    }
  }

  private setObserverHeight(idx: number): void {
    this.observerHeightIdx = idx;
    this.panel.querySelectorAll('.vs-height-btn').forEach((btn, i) => {
      if (i === idx) {
        btn.classList.add('border-green-400/50', 'text-green-400', 'bg-green-400/10');
        btn.classList.remove('border-gray-700/50', 'text-gray-500');
      } else {
        btn.classList.remove('border-green-400/50', 'text-green-400', 'bg-green-400/10');
        btn.classList.add('border-gray-700/50', 'text-gray-500');
      }
    });

    // Re-run if we have a previous result
    if (this.lastResult) {
      this.runAnalysis(this.lastResult.observerLon, this.lastResult.observerLat);
    }
  }

  private setLoading(loading: boolean): void {
    const el = this.panel.querySelector('#vs-loading') as HTMLElement;
    const err = this.panel.querySelector('#vs-error') as HTMLElement;
    if (loading) {
      el.classList.remove('hidden');
      err.classList.add('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  private setError(msg: string): void {
    const el = this.panel.querySelector('#vs-error') as HTMLElement;
    const msgEl = this.panel.querySelector('#vs-error-msg') as HTMLElement;
    el.classList.remove('hidden');
    msgEl.textContent = msg;
  }

  private updateResults(result: ViewshedResult, water: WaterVisibility, score: ViewScore): void {
    const r = this.panel.querySelector('#vs-results') as HTMLElement;
    r.classList.remove('hidden');

    // Score
    (this.panel.querySelector('#vs-score-total') as HTMLElement).textContent = String(score.total);
    (this.panel.querySelector('#vs-score-terrain') as HTMLElement).textContent = `${score.breakdown.terrainVisibility}/30`;
    (this.panel.querySelector('#vs-score-water') as HTMLElement).textContent = `${score.breakdown.waterBonus}/30`;
    (this.panel.querySelector('#vs-score-elev') as HTMLElement).textContent = `${score.breakdown.elevationAdvantage}/20`;
    (this.panel.querySelector('#vs-score-dist') as HTMLElement).textContent = `${score.breakdown.viewDistance}/20`;

    (this.panel.querySelector('#vs-bar-terrain') as HTMLElement).style.width = `${(score.breakdown.terrainVisibility / 30) * 100}%`;
    (this.panel.querySelector('#vs-bar-water') as HTMLElement).style.width = `${(score.breakdown.waterBonus / 30) * 100}%`;
    (this.panel.querySelector('#vs-bar-elev') as HTMLElement).style.width = `${(score.breakdown.elevationAdvantage / 20) * 100}%`;
    (this.panel.querySelector('#vs-bar-dist') as HTMLElement).style.width = `${(score.breakdown.viewDistance / 20) * 100}%`;

    // Score color
    const scoreEl = this.panel.querySelector('#vs-score-total') as HTMLElement;
    if (score.total >= 70) {
      scoreEl.className = 'text-2xl font-bold text-green-400 glow-green';
    } else if (score.total >= 40) {
      scoreEl.className = 'text-2xl font-bold text-amber-400 glow-amber';
    } else {
      scoreEl.className = 'text-2xl font-bold text-red-400 glow-red';
    }

    // Location info
    (this.panel.querySelector('#vs-position') as HTMLElement).textContent =
      `${result.observerLat.toFixed(5)}, ${result.observerLon.toFixed(5)}`;
    (this.panel.querySelector('#vs-terrain-elev') as HTMLElement).textContent =
      `${result.terrainHeight.toFixed(1)}m`;
    (this.panel.querySelector('#vs-obs-elev') as HTMLElement).textContent =
      `${(result.terrainHeight + result.observerHeight).toFixed(1)}m`;
    (this.panel.querySelector('#vs-visible-pct') as HTMLElement).textContent =
      `${(result.visibleFraction * 100).toFixed(1)}%`;

    // Water
    const waterVisEl = this.panel.querySelector('#vs-water-visible') as HTMLElement;
    waterVisEl.textContent = water.oceanVisible ? 'YES' : 'NO';
    waterVisEl.className = water.oceanVisible
      ? 'font-mono text-cyan-400 glow-cyan'
      : 'font-mono text-gray-500';

    (this.panel.querySelector('#vs-water-class') as HTMLElement).textContent = water.classification;
    (this.panel.querySelector('#vs-water-arc') as HTMLElement).textContent =
      water.arcDegrees > 0 ? `${water.arcDegrees.toFixed(0)}°` : '--';
    (this.panel.querySelector('#vs-water-dist') as HTMLElement).textContent =
      water.nearestWaterDistance ? `${(water.nearestWaterDistance / 1000).toFixed(1)}km @ ${water.nearestWaterBearing?.toFixed(0)}°` : '--';
  }
}
