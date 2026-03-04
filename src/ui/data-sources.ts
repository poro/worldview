// ============================================================
// Data Sources Panel — Bottom-left source health indicators
// ============================================================

import { bus } from '../bus';

interface SourceStatus {
  name: string;
  status: 'active' | 'stale' | 'error' | 'off';
  lastUpdate?: number;
  count?: number;
}

export class DataSourcesPanel {
  private el: HTMLElement;
  private sources: Map<string, SourceStatus> = new Map();

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'data-sources-panel';
    document.getElementById('ui-overlay')!.appendChild(this.el);

    // Initialize known sources
    this.sources.set('flights', { name: 'ADS-B', status: 'off' });
    this.sources.set('feed', { name: 'NEWS', status: 'off' });
    this.sources.set('satellites', { name: 'SAT', status: 'off' });
    this.sources.set('earthquakes', { name: 'USGS', status: 'off' });
    this.sources.set('maritime', { name: 'AIS', status: 'off' });

    this.render();

    // Listen for feed updates
    bus.on('feed:loaded', (count: number) => {
      this.updateSource('feed', 'active', count);
    });
  }

  updateSource(id: string, status: SourceStatus['status'], count?: number) {
    const src = this.sources.get(id);
    if (src) {
      src.status = status;
      src.lastUpdate = Date.now();
      if (count !== undefined) src.count = count;
      this.render();
    }
  }

  private render() {
    this.el.innerHTML = [...this.sources.values()].map(s => {
      const dot = s.status === 'active' ? '●' : s.status === 'stale' ? '◐' : s.status === 'error' ? '✕' : '○';
      const cls = `ds-status ds-${s.status}`;
      const count = s.count != null ? ` (${s.count})` : '';
      return `<span class="${cls}">${dot} ${s.name}${count}</span>`;
    }).join('');
  }
}
