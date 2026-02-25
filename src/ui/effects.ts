import { FilterMode } from '../filters/manager';

export interface ShaderParams {
  nightvision: {
    intensity: number;
    noise: number;
    bloom: number;
    vignette: number;
  };
  flir: {
    sensitivity: number;
    palette: number; // 0=classic, 1=white-hot, 2=black-hot, 3=rainbow
    pixelation: number;
  };
  crt: {
    scanlines: number;
    aberration: number;
    curvature: number;
    flicker: number;
  };
  enhanced: {
    edgeStrength: number;
    contrast: number;
    saturation: number;
  };
}

const DEFAULTS: ShaderParams = {
  nightvision: { intensity: 80, noise: 50, bloom: 60, vignette: 75 },
  flir: { sensitivity: 50, palette: 0, pixelation: 0 },
  crt: { scanlines: 50, aberration: 50, curvature: 50, flicker: 40 },
  enhanced: { edgeStrength: 50, contrast: 65, saturation: 60 },
};

const PALETTE_NAMES = ['Classic', 'White-Hot', 'Black-Hot', 'Rainbow'];

type ParamChangeCallback = (filter: FilterMode, params: Record<string, number>) => void;

export class EffectsPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private contentEl: HTMLElement;
  private _collapsed: boolean = true;
  private params: ShaderParams;
  private currentFilter: FilterMode = 'normal';
  private onParamChange: ParamChangeCallback | null = null;

  constructor() {
    this.params = JSON.parse(JSON.stringify(DEFAULTS));
    this.container = document.getElementById('ui-overlay')!;
    this.panel = document.createElement('div');
    this.panel.className = 'hud-element';
    this.panel.style.cssText = 'position:absolute;bottom:100px;right:16px;';

    this.panel.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto effects-panel" style="width:240px;border-color:rgba(0,229,255,0.2);">
        <button class="effects-toggle flex items-center justify-between w-full px-3 py-2 border-b border-gray-800/50 hover:bg-white/5 transition-colors">
          <div class="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span class="text-[10px] tracking-widest text-cyan-400">EFFECTS</span>
          </div>
          <span class="effects-chevron text-[10px] text-gray-500 transition-transform">▼</span>
        </button>
        <div class="effects-content" style="display:none;"></div>
      </div>
    `;

    this.container.appendChild(this.panel);
    this.contentEl = this.panel.querySelector('.effects-content')!;

    const toggleBtn = this.panel.querySelector('.effects-toggle')!;
    toggleBtn.addEventListener('click', () => this.toggleCollapse());
  }

  setOnParamChange(cb: ParamChangeCallback) {
    this.onParamChange = cb;
  }

  setFilter(mode: FilterMode) {
    this.currentFilter = mode;
    this.rebuildContent();
  }

  getParams(filter: FilterMode): Record<string, number> {
    const p = this.params[filter as keyof ShaderParams];
    if (!p) return {};
    return { ...p } as Record<string, number>;
  }

  private toggleCollapse() {
    this._collapsed = !this._collapsed;
    this.contentEl.style.display = this._collapsed ? 'none' : 'block';
    const chevron = this.panel.querySelector('.effects-chevron') as HTMLElement;
    chevron.textContent = this._collapsed ? '▼' : '▲';
  }

  private rebuildContent() {
    if (this.currentFilter === 'normal') {
      this.contentEl.innerHTML = `
        <div class="px-3 py-3 text-[10px] text-gray-500 text-center">
          Select a filter to adjust parameters
        </div>
      `;
      return;
    }

    const filterKey = this.currentFilter as keyof ShaderParams;
    const params = this.params[filterKey];

    let html = '<div class="px-3 py-2 space-y-3">';

    if (this.currentFilter === 'nightvision') {
      const p = params as ShaderParams['nightvision'];
      html += this.sliderRow('Intensity', 'intensity', p.intensity, 0, 100);
      html += this.sliderRow('Noise', 'noise', p.noise, 0, 100);
      html += this.sliderRow('Bloom', 'bloom', p.bloom, 0, 100);
      html += this.sliderRow('Vignette', 'vignette', p.vignette, 0, 100);
    } else if (this.currentFilter === 'flir') {
      const p = params as ShaderParams['flir'];
      html += this.sliderRow('Sensitivity', 'sensitivity', p.sensitivity, 0, 100);
      html += this.dropdownRow('Palette', 'palette', p.palette, PALETTE_NAMES);
      html += this.sliderRow('Pixelation', 'pixelation', p.pixelation, 0, 10);
    } else if (this.currentFilter === 'crt') {
      const p = params as ShaderParams['crt'];
      html += this.sliderRow('Scanlines', 'scanlines', p.scanlines, 0, 100);
      html += this.sliderRow('Aberration', 'aberration', p.aberration, 0, 100);
      html += this.sliderRow('Curvature', 'curvature', p.curvature, 0, 100);
      html += this.sliderRow('Flicker', 'flicker', p.flicker, 0, 100);
    } else if (this.currentFilter === 'enhanced') {
      const p = params as ShaderParams['enhanced'];
      html += this.sliderRow('Edge Strength', 'edgeStrength', p.edgeStrength, 0, 100);
      html += this.sliderRow('Contrast', 'contrast', p.contrast, 0, 100);
      html += this.sliderRow('Saturation', 'saturation', p.saturation, 0, 100);
    }

    html += `
      <div class="pt-1 border-t border-gray-800/50">
        <button class="effects-reset text-[9px] text-gray-500 hover:text-cyan-400 transition-colors tracking-wider">RESET DEFAULTS</button>
      </div>
    </div>`;

    this.contentEl.innerHTML = html;

    // Bind slider events
    this.contentEl.querySelectorAll('input[type="range"]').forEach((input) => {
      const el = input as HTMLInputElement;
      el.addEventListener('input', () => {
        const param = el.dataset.param!;
        const val = parseFloat(el.value);
        (this.params[filterKey] as any)[param] = val;
        const valueEl = el.parentElement!.querySelector('.slider-value') as HTMLElement;
        if (valueEl) valueEl.textContent = el.dataset.param === 'pixelation' ? val.toString() : `${Math.round(val)}%`;
        this.emitChange();
      });
    });

    // Bind dropdown events
    this.contentEl.querySelectorAll('select').forEach((sel) => {
      const el = sel as HTMLSelectElement;
      el.addEventListener('change', () => {
        const param = el.dataset.param!;
        (this.params[filterKey] as any)[param] = parseInt(el.value);
        this.emitChange();
      });
    });

    // Bind reset
    const resetBtn = this.contentEl.querySelector('.effects-reset');
    resetBtn?.addEventListener('click', () => {
      (this.params as any)[filterKey] = JSON.parse(JSON.stringify((DEFAULTS as any)[filterKey]));
      this.rebuildContent();
      this.emitChange();
    });
  }

  private emitChange() {
    if (this.onParamChange && this.currentFilter !== 'normal') {
      this.onParamChange(this.currentFilter, this.getParams(this.currentFilter));
    }
  }

  private sliderRow(label: string, param: string, value: number, min: number, max: number): string {
    const displayValue = param === 'pixelation' ? value.toString() : `${Math.round(value)}%`;
    return `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-[9px] tracking-wider text-gray-400 uppercase">${label}</span>
          <span class="slider-value text-[9px] text-cyan-400 font-mono">${displayValue}</span>
        </div>
        <input type="range" class="effect-slider" data-param="${param}" min="${min}" max="${max}" value="${value}" step="${param === 'pixelation' ? 1 : 1}" />
      </div>
    `;
  }

  private dropdownRow(label: string, param: string, value: number, options: string[]): string {
    return `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-[9px] tracking-wider text-gray-400 uppercase">${label}</span>
        </div>
        <select data-param="${param}" class="effect-dropdown w-full bg-gray-900 border border-gray-700 text-[10px] text-cyan-400 px-2 py-1 rounded-sm outline-none">
          ${options.map((opt, i) => `<option value="${i}" ${i === value ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      </div>
    `;
  }
}
