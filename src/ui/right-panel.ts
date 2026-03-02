// ============================================
// Right Side Panel — Controls and toggles
// ============================================

import { ViewMode, ViewModeManager } from './view-modes';

export interface RightPanelCallbacks {
  onViewModeChange: (mode: ViewMode) => void;
  onToggleHUD: () => void;
  onToggleFlights: () => void;
  onToggleSatellites: () => void;
  onCleanUI: () => void;
}

export class RightPanel {
  private container: HTMLElement;
  private callbacks: RightPanelCallbacks;
  private viewModeManager: ViewModeManager;
  private root: HTMLElement | null = null;

  constructor(callbacks: RightPanelCallbacks, viewModeManager: ViewModeManager) {
    this.callbacks = callbacks;
    this.viewModeManager = viewModeManager;
    this.container = document.getElementById('ui-overlay')!;
    this.build();
  }

  private build() {
    this.root = document.createElement('div');
    this.root.className = 'hud-element right-panel';
    this.root.style.cssText = 'position:absolute;top:80px;right:16px;pointer-events:auto;z-index:50;';
    this.root.innerHTML = `
      <div class="cmd-panel rounded-sm px-3 py-3 space-y-3" style="min-width:180px">
        <div class="data-label mb-2">CONTROLS</div>

        <button class="right-panel-btn" id="rp-sharpen">
          <span class="rp-dot" style="background:#00e5ff"></span> SHARPEN
        </button>

        <button class="right-panel-btn" id="rp-hud">
          <span class="rp-dot" style="background:#00ff88"></span> HUD
        </button>

        <div class="flex items-center gap-2">
          <span class="text-[9px] text-gray-500 tracking-wider">VIEW</span>
          <select id="rp-view-mode" class="rp-select">
            <option value="normal">Normal</option>
            <option value="tactical">Tactical</option>
            <option value="nightvision">Night Vision</option>
          </select>
        </div>

        <div class="border-t border-gray-800/50 pt-2">
          <div class="data-label mb-1">LAYERS</div>
          <label class="rp-check"><input type="checkbox" id="rp-flights" checked /> Flights</label>
          <label class="rp-check"><input type="checkbox" id="rp-sats" checked /> Satellites</label>
        </div>

        <button class="right-panel-btn clean-ui-btn" id="rp-clean">CLEAN UI</button>
      </div>
    `;

    this.container.appendChild(this.root);

    // Bind events
    this.root.querySelector('#rp-hud')!.addEventListener('click', () => this.callbacks.onToggleHUD());
    this.root.querySelector('#rp-flights')!.addEventListener('change', () => this.callbacks.onToggleFlights());
    this.root.querySelector('#rp-sats')!.addEventListener('change', () => this.callbacks.onToggleSatellites());
    this.root.querySelector('#rp-clean')!.addEventListener('click', () => this.callbacks.onCleanUI());

    const viewSelect = this.root.querySelector('#rp-view-mode') as HTMLSelectElement;
    viewSelect.addEventListener('change', () => {
      const mode = viewSelect.value as ViewMode;
      this.viewModeManager.setMode(mode);
      this.callbacks.onViewModeChange(mode);
    });

    // Sharpen toggle
    let sharpened = false;
    this.root.querySelector('#rp-sharpen')!.addEventListener('click', () => {
      sharpened = !sharpened;
      const canvas = document.querySelector('#cesiumContainer canvas') as HTMLCanvasElement;
      if (canvas) {
        canvas.style.imageRendering = sharpened ? 'crisp-edges' : '';
      }
    });
  }
}
