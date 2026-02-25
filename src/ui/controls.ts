import { FilterMode } from '../filters/manager';
import { TOAST_DURATION, ERROR_TOAST_DURATION } from '../config';

export interface LocationPreset {
  key: string;
  label: string;
  lon: number;
  lat: number;
  alt: number;
}

export const LOCATION_PRESETS: LocationPreset[] = [
  { key: 'Q', label: 'Pentagon', lon: -77.0559, lat: 38.8711, alt: 800 },
  { key: 'W', label: 'Kremlin', lon: 37.6175, lat: 55.7520, alt: 800 },
  { key: 'E', label: 'Times Square', lon: -73.9855, lat: 40.7580, alt: 500 },
  { key: 'R', label: 'Shibuya', lon: 139.7004, lat: 35.6595, alt: 400 },
  { key: 'O', label: 'Sydney Opera', lon: 151.2153, lat: -33.8568, alt: 600 },
  { key: 'Y', label: 'Eiffel Tower', lon: 2.2945, lat: 48.8584, alt: 500 },
  { key: 'U', label: 'Burj Khalifa', lon: 55.2744, lat: 25.1972, alt: 800 },
  { key: 'I', label: 'Colosseum', lon: 12.4922, lat: 41.8902, alt: 400 },
];

export interface ControlCallbacks {
  onFilterChange: (mode: FilterMode) => void;
  onToggleFlights: () => void;
  onToggleSatellites: () => void;
  onToggleEarthquakes: () => void;
  onToggleTraffic: () => void;
  onToggleMilitary: () => void;
  onToggleCCTV: () => void;
  onToggleHUD: () => void;
  onSearch: (query: string) => void;
  onLocationSelect: (preset: LocationPreset) => void;
  onToggle3D: () => void;
}

export class Controls {
  private container: HTMLElement;
  private callbacks: ControlCallbacks;
  private filterBtns: Map<FilterMode, HTMLElement> = new Map();
  private layerBtns: Map<string, HTMLElement> = new Map();
  private tileToggleBtn: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ui-overlay')!;
    this.buildFilterBar();
    this.buildLayerPanel();
    this.buildSearchBar();
    this.buildLocationsBar();
    this.buildTileToggle();
    this.buildToast();
    this.buildKeybindHint();
  }

  setActiveFilter(mode: FilterMode) {
    this.filterBtns.forEach((btn, key) => {
      btn.classList.toggle('active', key === mode);
    });
  }

  setLayerState(layer: string, active: boolean) {
    const btn = this.layerBtns.get(layer);
    if (btn) {
      btn.classList.toggle('active', active);
      const indicator = btn.querySelector('.toggle-indicator') as HTMLElement;
      if (indicator) {
        indicator.style.background = active ? '#00ff88' : '#3a3a5c';
      }
    }
  }

  private buildFilterBar() {
    const filters: { mode: FilterMode; label: string; key: string }[] = [
      { mode: 'normal', label: 'STD', key: '1' },
      { mode: 'nightvision', label: 'NV', key: '2' },
      { mode: 'flir', label: 'FLIR', key: '3' },
      { mode: 'crt', label: 'CRT', key: '4' },
      { mode: 'enhanced', label: 'ENH', key: '5' },
    ];

    const bar = document.createElement('div');
    bar.className = 'hud-element';
    bar.style.cssText = 'position:absolute;bottom:56px;left:50%;transform:translateX(-50%);';
    bar.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto flex items-center gap-1 px-2 py-1.5">
        <span class="data-label mr-2">FILTER</span>
        ${filters.map((f) => `
          <button class="filter-btn px-2.5 py-1 text-[10px] tracking-wider border border-gray-800 rounded-sm hover:border-green-400/30 transition-all ${f.mode === 'normal' ? 'active' : ''}" data-filter="${f.mode}">
            <span class="text-[8px] text-gray-600 mr-1">${f.key}</span>${f.label}
          </button>
        `).join('')}
      </div>
    `;
    this.container.appendChild(bar);

    filters.forEach((f) => {
      const btn = bar.querySelector(`[data-filter="${f.mode}"]`) as HTMLElement;
      this.filterBtns.set(f.mode, btn);
      btn.addEventListener('click', () => this.callbacks.onFilterChange(f.mode));
    });
  }

  private buildLayerPanel() {
    const layers = [
      { id: 'flights', label: 'FLIGHTS', icon: '\u2708', key: 'F', active: true },
      { id: 'military', label: 'MILITARY', icon: '\u25C6', key: 'M', active: false },
      { id: 'satellites', label: 'SATS', icon: '\u25C9', key: 'S', active: true },
      { id: 'earthquakes', label: 'QUAKES', icon: '\u25CE', key: 'G', active: true },
      { id: 'traffic', label: 'TRAFFIC', icon: '\u25CF', key: 'T', active: true },
      { id: 'cctv', label: 'CCTV', icon: '\u25CE', key: 'C', active: true },
    ];

    const panel = document.createElement('div');
    panel.className = 'hud-element';
    panel.style.cssText = 'position:absolute;top:80px;left:16px;';
    panel.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto px-3 py-2 space-y-1" style="min-width:150px">
        <div class="data-label mb-2">LAYERS</div>
        ${layers.map((l) => `
          <button class="layer-toggle ${l.active ? 'active' : ''} flex items-center gap-2 w-full px-2 py-1.5 border border-transparent rounded-sm hover:border-gray-700 transition-all text-left" data-layer="${l.id}">
            <div class="toggle-indicator w-1.5 h-1.5 rounded-full" style="background:${l.active ? '#00ff88' : '#3a3a5c'}"></div>
            <span class="text-[10px] tracking-wider">${l.label}</span>
            <span class="text-[8px] text-gray-600 ml-auto">${l.key}</span>
          </button>
        `).join('')}
      </div>
    `;
    this.container.appendChild(panel);

    layers.forEach((l) => {
      const btn = panel.querySelector(`[data-layer="${l.id}"]`) as HTMLElement;
      this.layerBtns.set(l.id, btn);
      btn.addEventListener('click', () => {
        if (l.id === 'flights') this.callbacks.onToggleFlights();
        else if (l.id === 'military') this.callbacks.onToggleMilitary();
        else if (l.id === 'satellites') this.callbacks.onToggleSatellites();
        else if (l.id === 'earthquakes') this.callbacks.onToggleEarthquakes();
        else if (l.id === 'traffic') this.callbacks.onToggleTraffic();
        else if (l.id === 'cctv') this.callbacks.onToggleCCTV();
      });
    });
  }

  private buildSearchBar() {
    const search = document.createElement('div');
    search.className = 'hud-element';
    search.style.cssText = 'position:absolute;top:16px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 200px);';
    search.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto flex items-center px-3 py-1.5" style="min-width:260px;width:300px;">
        <span class="text-green-400/50 text-xs mr-2">\u25B8</span>
        <input
          id="search-input"
          type="text"
          class="bg-transparent border-none outline-none text-xs text-green-400 placeholder-gray-600 flex-1 font-mono min-w-0"
          placeholder="SEARCH LOCATION..."
          spellcheck="false"
        />
        <span class="text-[8px] text-gray-600">/</span>
      </div>
    `;
    this.container.appendChild(search);

    const input = document.getElementById('search-input') as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.callbacks.onSearch(input.value);
        input.value = '';
        input.blur();
      }
      if (e.key === 'Escape') {
        input.value = '';
        input.blur();
      }
      e.stopPropagation();
    });

    (window as { __searchInput?: HTMLInputElement }).__searchInput = input;
  }

  private buildLocationsBar() {
    const bar = document.createElement('div');
    bar.className = 'hud-element';
    bar.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 100px);overflow-x:auto;';
    bar.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto flex items-center gap-1 px-2 py-1.5">
        <span class="data-label mr-1 flex-shrink-0">NAV</span>
        ${LOCATION_PRESETS.map((p) => `
          <button class="loc-btn px-2 py-1 text-[9px] tracking-wider border border-gray-800 rounded-sm hover:border-cyan-400/40 hover:text-cyan-400 transition-all text-gray-500 flex-shrink-0" data-loc-key="${p.key}" title="${p.label}">
            <span class="text-[7px] text-gray-600 mr-0.5">${p.key}</span>${p.label.split(' ')[0].toUpperCase().slice(0, 6)}
          </button>
        `).join('')}
      </div>
    `;
    this.container.appendChild(bar);

    LOCATION_PRESETS.forEach((p) => {
      const btn = bar.querySelector(`[data-loc-key="${p.key}"]`) as HTMLElement;
      btn.addEventListener('click', () => this.callbacks.onLocationSelect(p));
    });
  }

  private buildTileToggle() {
    const toggle = document.createElement('div');
    toggle.className = 'hud-element';
    toggle.style.cssText = 'position:absolute;top:80px;right:16px;';
    toggle.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto px-3 py-2">
        <div class="data-label mb-1.5">TILES</div>
        <button id="tile-toggle-btn" class="flex items-center gap-2 w-full px-2 py-1.5 border border-cyan-400/30 rounded-sm hover:border-cyan-400/60 transition-all text-left text-cyan-400 text-[10px] tracking-wider">
          <div class="w-1.5 h-1.5 rounded-full" style="background:#00e5ff;box-shadow:0 0 6px rgba(0,229,255,0.5)"></div>
          GOOGLE 3D
        </button>
      </div>
    `;
    this.container.appendChild(toggle);

    this.tileToggleBtn = toggle.querySelector('#tile-toggle-btn') as HTMLElement;
    this.tileToggleBtn.addEventListener('click', () => this.callbacks.onToggle3D());
  }

  setTileMode(google3D: boolean) {
    if (!this.tileToggleBtn) return;
    if (google3D) {
      this.tileToggleBtn.innerHTML = `<div class="w-1.5 h-1.5 rounded-full" style="background:#00e5ff;box-shadow:0 0 6px rgba(0,229,255,0.5)"></div>GOOGLE 3D`;
      this.tileToggleBtn.style.borderColor = 'rgba(0,229,255,0.3)';
      this.tileToggleBtn.style.color = '#00e5ff';
    } else {
      this.tileToggleBtn.innerHTML = `<div class="w-1.5 h-1.5 rounded-full" style="background:#00ff88;box-shadow:0 0 6px rgba(0,255,136,0.5)"></div>STANDARD`;
      this.tileToggleBtn.style.borderColor = 'rgba(0,255,136,0.3)';
      this.tileToggleBtn.style.color = '#00ff88';
    }
  }

  private buildToast() {
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'hud-element';
    this.toastEl.style.cssText = 'position:absolute;top:100px;left:50%;transform:translateX(-50%);opacity:0;transition:opacity 0.3s ease;pointer-events:none;z-index:100;';
    this.toastEl.innerHTML = `
      <div class="cmd-panel rounded-sm px-4 py-2 text-center" id="toast-container" style="border-color:rgba(0,229,255,0.4)">
        <span id="toast-text" class="text-cyan-400 text-xs tracking-widest glow-cyan"></span>
      </div>
    `;
    this.container.appendChild(this.toastEl);
  }

  showToast(text: string, type: 'info' | 'error' = 'info') {
    if (!this.toastEl) return;
    const span = this.toastEl.querySelector('#toast-text') as HTMLElement;
    const container = this.toastEl.querySelector('#toast-container') as HTMLElement;
    span.textContent = text;

    if (type === 'error') {
      span.className = 'text-red-400 text-xs tracking-widest glow-red';
      container.style.borderColor = 'rgba(255,61,61,0.4)';
    } else {
      span.className = 'text-cyan-400 text-xs tracking-widest glow-cyan';
      container.style.borderColor = 'rgba(0,229,255,0.4)';
    }

    this.toastEl.style.opacity = '1';
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      if (this.toastEl) this.toastEl.style.opacity = '0';
    }, type === 'error' ? ERROR_TOAST_DURATION : TOAST_DURATION);
  }

  private buildKeybindHint() {
    const hint = document.createElement('div');
    hint.className = 'hud-element';
    hint.style.cssText = 'position:absolute;bottom:16px;right:16px;';
    hint.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto px-3 py-2 keybind-panel">
        <div class="data-label mb-1.5">KEYS</div>
        <div class="space-y-0.5 text-[9px] text-gray-600">
          <div><span class="text-gray-500">1-5</span> Filters</div>
          <div><span class="text-gray-500">F</span> Flights</div>
          <div><span class="text-gray-500">M</span> Military</div>
          <div><span class="text-gray-500">S</span> Sats</div>
          <div><span class="text-gray-500">T</span> Traffic</div>
          <div><span class="text-gray-500">G</span> Quakes</div>
          <div><span class="text-gray-500">C</span> CCTV</div>
          <div><span class="text-gray-500">H</span> HUD</div>
          <div><span class="text-gray-500">/</span> Search</div>
          <div class="mt-1 pt-1 border-t border-gray-800"><span class="text-cyan-600">Q-I</span> <span class="text-cyan-700">Locations</span></div>
          <div><span class="text-gray-500">ESC</span> Close</div>
        </div>
      </div>
    `;
    this.container.appendChild(hint);
  }
}
