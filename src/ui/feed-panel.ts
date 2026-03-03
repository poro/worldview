// ============================================================
// Feed Panel — Right-side scrollable claim feed
// ============================================================

import { Claim, INFO_EVENT_COLORS, InfoEventType } from '../feed/types';
import { FEED_CONFIG } from '../feed/config';

export interface FeedPanelCallbacks {
  onClaimClick: (claimId: string) => void;
  onModeSwitch?: (mode: 'live' | 'scenario') => void;
}

type FilterType = 'all' | 'disinfo_state' | 'deepfake' | 'misinfo_organic' | 'correction' | 'critical' | 'high';

export class FeedPanel {
  private container: HTMLElement;
  private root: HTMLElement;
  private listEl: HTMLElement;
  private callbacks: FeedPanelCallbacks;
  private claims: Claim[] = [];
  private filter: FilterType = 'all';
  private _visible: boolean = false;
  private highlightedId: string | null = null;

  constructor(callbacks: FeedPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ui-overlay')!;
    this.root = document.createElement('div');
    this.listEl = document.createElement('div');
    this.build();
  }

  get visible(): boolean { return this._visible; }

  setVisible(visible: boolean) {
    this._visible = visible;
    this.root.style.display = visible ? '' : 'none';
  }

  setClaims(claims: Claim[]) {
    this.claims = [...claims].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    this.renderList();
  }

  highlightClaim(claimId: string) {
    this.highlightedId = claimId;
    // Scroll to claim in feed
    const el = this.listEl.querySelector(`[data-claim-id="${claimId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.classList.add('feed-item-highlight');
      setTimeout(() => el.classList.remove('feed-item-highlight'), 2000);
    }
  }

  destroy() {
    this.root.remove();
  }

  private build() {
    this.root.className = 'hud-element feed-panel-root';
    this.root.style.cssText = 'position:absolute;top:80px;right:16px;z-index:55;pointer-events:auto;display:none;';
    this.root.innerHTML = `
      <div class="cmd-panel rounded-sm" style="width:320px;max-height:calc(100vh - 200px);display:flex;flex-direction:column;">
        <div class="px-3 py-2 border-b border-gray-800/50" style="flex-shrink:0;">
          <div class="flex items-center justify-between mb-1">
            <span class="data-label tracking-wider" style="color:#E91E63;">THE FEED</span>
            <span class="text-[8px] text-gray-600" id="feed-count">0 claims</span>
          </div>
          <div class="flex gap-1 mb-2" id="feed-mode-toggle">
            <button class="feed-mode-btn active" data-mode="live" style="font-size:8px;padding:2px 8px;background:#E91E63;color:white;border:1px solid #E91E63;border-radius:2px;cursor:pointer;letter-spacing:1px;">● LIVE</button>
            <button class="feed-mode-btn" data-mode="scenario" style="font-size:8px;padding:2px 8px;background:transparent;color:#666;border:1px solid #333;border-radius:2px;cursor:pointer;letter-spacing:1px;">SCENARIO</button>
          </div>
          <div class="flex gap-1 flex-wrap" id="feed-filters"></div>
        </div>
        <div class="feed-panel-list px-2 py-1" style="overflow-y:auto;flex:1;" id="feed-list"></div>
      </div>
    `;
    this.container.appendChild(this.root);

    this.listEl = this.root.querySelector('#feed-list')!;

    // Build filter buttons
    const filtersEl = this.root.querySelector('#feed-filters')!;
    const filters: { id: FilterType; label: string }[] = [
      { id: 'all', label: 'ALL' },
      { id: 'disinfo_state', label: 'STATE' },
      { id: 'deepfake', label: 'DEEPFAKE' },
      { id: 'misinfo_organic', label: 'MISINFO' },
      { id: 'correction', label: 'CORRECT' },
      { id: 'critical', label: 'CRIT' },
    ];

    for (const f of filters) {
      const btn = document.createElement('button');
      btn.className = `feed-filter-btn ${f.id === 'all' ? 'active' : ''}`;
      btn.textContent = f.label;
      btn.dataset.filter = f.id;
      btn.addEventListener('click', () => {
        this.filter = f.id;
        filtersEl.querySelectorAll('.feed-filter-btn').forEach(b =>
          b.classList.toggle('active', (b as HTMLElement).dataset.filter === f.id)
        );
        this.renderList();
      });
      filtersEl.appendChild(btn);
    }

    // Mode toggle buttons
    const modeToggle = this.root.querySelector('#feed-mode-toggle')!;
    modeToggle.querySelectorAll('.feed-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as 'live' | 'scenario';
        modeToggle.querySelectorAll('.feed-mode-btn').forEach(b => {
          const el = b as HTMLElement;
          const isActive = el.dataset.mode === mode;
          el.classList.toggle('active', isActive);
          if (isActive) {
            el.style.background = mode === 'live' ? '#E91E63' : '#7C4DFF';
            el.style.color = 'white';
            el.style.borderColor = mode === 'live' ? '#E91E63' : '#7C4DFF';
          } else {
            el.style.background = 'transparent';
            el.style.color = '#666';
            el.style.borderColor = '#333';
          }
        });
        this.callbacks.onModeSwitch?.(mode);
      });
    });
  }

  private renderList() {
    const filtered = this.claims.filter(c => this.matchesFilter(c));
    const max = FEED_CONFIG.FEED_PANEL_MAX_ITEMS;
    const displayed = filtered.slice(0, max);

    // Update count
    const countEl = this.root.querySelector('#feed-count');
    if (countEl) countEl.textContent = `${filtered.length} claims`;

    this.listEl.innerHTML = '';

    for (const claim of displayed) {
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.dataset.claimId = claim.id;
      item.innerHTML = this.buildFeedItem(claim);
      item.addEventListener('click', () => {
        this.callbacks.onClaimClick(claim.id);
      });
      this.listEl.appendChild(item);
    }
  }

  private matchesFilter(claim: Claim): boolean {
    switch (this.filter) {
      case 'all': return true;
      case 'disinfo_state': return claim.infoEventType === 'disinfo_state' || claim.infoEventType === 'disinfo_proxy';
      case 'deepfake': return claim.infoEventType === 'deepfake';
      case 'misinfo_organic': return claim.infoEventType === 'misinfo_organic' || claim.infoEventType === 'misinfo_outdated';
      case 'correction': return claim.infoEventType === 'correction' || claim.infoEventType === 'verification';
      case 'critical': return claim.severityTier === 'critical';
      case 'high': return claim.severityTier === 'high' || claim.severityTier === 'critical';
      default: return true;
    }
  }

  private buildFeedItem(claim: Claim): string {
    const color = INFO_EVENT_COLORS[claim.infoEventType] || '#ffffff';
    const typeLabel = claim.infoEventType.replace(/_/g, ' ').toUpperCase();
    const timeStr = new Date(claim.timestamp).toUTCString().slice(17, 22) + ' UTC';
    const reachStr = this.formatReach(claim.reach.estimatedImpressions);
    const reachPct = Math.min(100, (claim.reach.estimatedImpressions / 200000000) * 100);

    return `
      <div class="feed-item-inner" style="border-left:2px solid ${color};">
        <div class="feed-item-time">${timeStr}</div>
        <div class="feed-item-headline">${claim.headline}</div>
        <div class="feed-item-source">${claim.source.name} (${claim.source.country}) ★ ${claim.source.credibilityRating}</div>
        <div class="feed-item-reach-bar">
          <div class="feed-item-reach-fill" style="width:${reachPct}%;background:${color}"></div>
        </div>
        <div class="feed-item-reach-label">${reachStr} reach</div>
        <div class="feed-item-badges">
          <span class="feed-badge severity-${claim.severityTier}">${claim.severityTier.toUpperCase()}</span>
          <span class="feed-badge" style="color:${color}">${typeLabel}</span>
        </div>
      </div>
    `;
  }

  private formatReach(n: number): string {
    if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return String(n);
  }
}
