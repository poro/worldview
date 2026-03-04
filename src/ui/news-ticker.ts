// ============================================================
// News Ticker — Breaking news crawler at bottom of screen
// ============================================================
//
// Bloomberg/CNN-style ticker showing live articles scrolling R→L.
// Clicking an item flies to its location on the globe.

import type { LiveArticle } from '../feed/types';
import { bus } from '../bus';

export class NewsTicker {
  private el: HTMLElement;
  private track: HTMLElement;
  private articles: LiveArticle[] = [];
  private _visible = true;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'news-ticker';
    this.el.innerHTML = `
      <div class="news-ticker-label">
        <span class="ticker-dot"></span>
        LIVE
      </div>
      <div class="news-ticker-track-wrapper">
        <div class="news-ticker-track"></div>
      </div>
    `;
    this.track = this.el.querySelector('.news-ticker-track')!;
    document.getElementById('ui-overlay')!.appendChild(this.el);
  }

  get visible(): boolean { return this._visible; }

  toggle() {
    this._visible = !this._visible;
    this.el.style.display = this._visible ? '' : 'none';
  }

  setArticles(articles: LiveArticle[]) {
    this.articles = articles.slice(0, 30); // Cap at 30 items
    this.render();
  }

  private render() {
    if (!this.articles.length) {
      this.track.innerHTML = '<span class="ticker-item ticker-empty">Awaiting live data...</span>';
      return;
    }

    // Duplicate items for seamless loop
    const items = [...this.articles, ...this.articles];
    this.track.innerHTML = items.map(a => {
      const severity = a.severity || 'low';
      const time = this.formatTime(a.timestamp);
      return `<span class="ticker-item severity-${severity}" data-lat="${a.origin.lat}" data-lon="${a.origin.lon}">
        <span class="ticker-severity-dot severity-${severity}"></span>
        <span class="ticker-time">${time}</span>
        <span class="ticker-headline">${this.escapeHtml(a.headline)}</span>
        <span class="ticker-source">${this.escapeHtml(a.source)}</span>
      </span>`;
    }).join('<span class="ticker-sep">│</span>');

    // Re-apply animation
    this.track.style.animation = 'none';
    this.track.offsetHeight; // force reflow
    const duration = Math.max(30, this.articles.length * 4); // seconds
    this.track.style.animation = `ticker-scroll ${duration}s linear infinite`;

    // Click to fly
    this.track.querySelectorAll('.ticker-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = parseFloat((item as HTMLElement).dataset.lat || '0');
        const lon = parseFloat((item as HTMLElement).dataset.lon || '0');
        if (lat || lon) {
          bus.emit('nav:flyto', lon, lat, 2000000, 1.5);
        }
      });
    });
  }

  private formatTime(ts: string): string {
    const d = new Date(ts);
    const now = Date.now();
    const diffMin = Math.floor((now - d.getTime()) / 60000);
    if (diffMin < 1) return 'NOW';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
