// ============================================
// Bottom Filter Bar — Color-coded toggleable pills
// ============================================

export interface FilterBarCallbacks {
  onToggle: (id: string, active: boolean) => void;
}

interface FilterPill {
  id: string;
  label: string;
  color: string;
  active: boolean;
  row: 1 | 2;
}

const PILLS: FilterPill[] = [
  // Row 1 — data layers
  { id: 'commercial', label: 'Commercial Flights', color: '#4dabf7', active: true, row: 1 },
  { id: 'military', label: 'Military Flights', color: '#ff4500', active: true, row: 1 },
  { id: 'gps-jamming', label: 'GPS Jamming', color: '#ffb300', active: true, row: 1 },
  { id: 'ground-truth', label: 'Ground Truth Cards', color: '#00ff88', active: true, row: 1 },
  { id: 'imaging-sats', label: 'Imaging Satellites', color: '#00e5ff', active: true, row: 1 },
  { id: 'maritime', label: 'Maritime Traffic', color: '#808080', active: true, row: 1 },
  { id: 'airspace', label: 'Airspace Closures', color: '#ff3d3d', active: true, row: 1 },
  { id: 'vhf', label: 'VHF Intercept', color: '#9966ff', active: false, row: 1 },
  { id: 'blackout', label: 'Internet Blackout', color: '#cc0000', active: true, row: 1 },
  { id: 'borders', label: 'Country Borders', color: '#ff6688', active: true, row: 1 },
  { id: 'osint', label: 'OSINT Social Events', color: '#66ccff', active: false, row: 1 },
  // Row 2 — event categories
  { id: 'evt-kinetic', label: 'Kinetic', color: '#ff3d3d', active: true, row: 2 },
  { id: 'evt-retaliation', label: 'Retaliation', color: '#ffb300', active: true, row: 2 },
  { id: 'evt-civilian', label: 'Civilian Impact', color: '#ff8c00', active: true, row: 2 },
  { id: 'evt-war', label: 'War', color: '#ff0000', active: false, row: 2 },
  { id: 'evt-infrastructure', label: 'Infrastructure', color: '#ff6600', active: true, row: 2 },
  { id: 'evt-escalation', label: 'Escalation', color: '#ff00ff', active: true, row: 2 },
];

export class FilterBar {
  private container: HTMLElement;
  private callbacks: FilterBarCallbacks;
  private pillStates: Map<string, boolean> = new Map();
  private pillElements: Map<string, HTMLElement> = new Map();

  constructor(callbacks: FilterBarCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ui-overlay')!;
    for (const pill of PILLS) {
      this.pillStates.set(pill.id, pill.active);
    }
    this.build();
  }

  isActive(id: string): boolean {
    return this.pillStates.get(id) ?? false;
  }

  private build() {
    const root = document.createElement('div');
    root.className = 'hud-element filter-bar-container';
    root.style.cssText = 'position:absolute;bottom:0;left:0;right:0;z-index:60;pointer-events:auto;';

    const row1 = PILLS.filter(p => p.row === 1);
    const row2 = PILLS.filter(p => p.row === 2);

    root.innerHTML = `
      <div class="filter-bar-panel">
        <div class="filter-bar-row">${row1.map(p => this.pillHtml(p)).join('')}</div>
        <div class="filter-bar-row">${row2.map(p => this.pillHtml(p)).join('')}</div>
      </div>
    `;

    this.container.appendChild(root);

    // Bind click events
    for (const pill of PILLS) {
      const el = root.querySelector(`[data-pill-id="${pill.id}"]`) as HTMLElement;
      if (el) {
        this.pillElements.set(pill.id, el);
        el.addEventListener('click', () => {
          const newState = !this.pillStates.get(pill.id);
          this.pillStates.set(pill.id, newState);
          el.classList.toggle('active', newState);
          this.callbacks.onToggle(pill.id, newState);
        });
      }
    }
  }

  private pillHtml(pill: FilterPill): string {
    return `
      <button class="filter-pill ${pill.active ? 'active' : ''}" data-pill-id="${pill.id}">
        <span class="filter-pill-dot" style="background:${pill.color}"></span>
        <span class="filter-pill-label">${pill.label}</span>
      </button>
    `;
  }
}
