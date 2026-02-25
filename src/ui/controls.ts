import { FilterMode } from '../filters/manager';

export interface ControlCallbacks {
  onFilterChange: (mode: FilterMode) => void;
  onToggleFlights: () => void;
  onToggleSatellites: () => void;
  onToggleEarthquakes: () => void;
  onToggleHUD: () => void;
  onSearch: (query: string) => void;
}

export class Controls {
  private container: HTMLElement;
  private callbacks: ControlCallbacks;
  private filterBtns: Map<FilterMode, HTMLElement> = new Map();
  private layerBtns: Map<string, HTMLElement> = new Map();

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ui-overlay')!;
    this.buildFilterBar();
    this.buildLayerPanel();
    this.buildSearchBar();
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
      { id: 'flights', label: 'FLIGHTS', icon: '✈', key: 'F', active: true },
      { id: 'satellites', label: 'SATS', icon: '◉', key: 'S', active: true },
      { id: 'earthquakes', label: 'QUAKES', icon: '◎', key: 'Q', active: true },
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
        else if (l.id === 'satellites') this.callbacks.onToggleSatellites();
        else if (l.id === 'earthquakes') this.callbacks.onToggleEarthquakes();
      });
    });
  }

  private buildSearchBar() {
    const search = document.createElement('div');
    search.className = 'hud-element';
    search.style.cssText = 'position:absolute;top:16px;left:50%;transform:translateX(-50%);';
    search.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto flex items-center px-3 py-1.5" style="min-width:300px">
        <span class="text-green-400/50 text-xs mr-2">▸</span>
        <input
          id="search-input"
          type="text"
          class="bg-transparent border-none outline-none text-xs text-green-400 placeholder-gray-600 flex-1 font-mono"
          placeholder="SEARCH LOCATION... (lat,lon or name)"
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

    // Focus search on / key
    (window as any).__searchInput = input;
  }

  private buildKeybindHint() {
    const hint = document.createElement('div');
    hint.className = 'hud-element';
    hint.style.cssText = 'position:absolute;bottom:16px;right:16px;';
    hint.innerHTML = `
      <div class="cmd-panel rounded-sm pointer-events-auto px-3 py-2">
        <div class="data-label mb-1.5">KEYS</div>
        <div class="space-y-0.5 text-[9px] text-gray-600">
          <div><span class="text-gray-500">1-5</span> Filters</div>
          <div><span class="text-gray-500">F</span> Flights</div>
          <div><span class="text-gray-500">S</span> Sats</div>
          <div><span class="text-gray-500">H</span> HUD</div>
          <div><span class="text-gray-500">/</span> Search</div>
          <div><span class="text-gray-500">ESC</span> Close</div>
        </div>
      </div>
    `;
    this.container.appendChild(hint);
  }
}
