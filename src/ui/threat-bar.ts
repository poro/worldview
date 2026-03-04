// ============================================================
// Threat Bar — Top-right global status indicators
// ============================================================
//
// Shows: DEFCON level, active conflicts, threat assessment, time

import type { Claim } from '../feed/types';
import { bus } from '../bus';

interface ThreatState {
  defcon: number;
  conflicts: number;
  criticalEvents: number;
  threatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'SEVERE' | 'CRITICAL';
}

export class ThreatBar {
  private el: HTMLElement;
  private state: ThreatState = {
    defcon: 3,
    conflicts: 0,
    criticalEvents: 0,
    threatLevel: 'ELEVATED',
  };

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'threat-bar';
    document.getElementById('ui-overlay')!.appendChild(this.el);
    this.render();

    // Update when feed loads
    bus.on('feed:loaded', (count: number) => {
      this.updateFromFeedCount(count);
    });

    // Update clock every second
    setInterval(() => this.updateClock(), 1000);
  }

  updateFromClaims(claims: Claim[]) {
    const critical = claims.filter(c => c.severityTier === 'critical').length;
    const high = claims.filter(c => c.severityTier === 'high').length;

    this.state.conflicts = claims.length;
    this.state.criticalEvents = critical;

    if (critical >= 5) this.state.threatLevel = 'CRITICAL';
    else if (critical >= 2 || high >= 5) this.state.threatLevel = 'SEVERE';
    else if (critical >= 1 || high >= 3) this.state.threatLevel = 'HIGH';
    else if (high >= 1) this.state.threatLevel = 'ELEVATED';
    else this.state.threatLevel = 'LOW';

    this.render();
  }

  updateFromFeedCount(count: number) {
    this.state.conflicts = count;
    if (count > 20) this.state.threatLevel = 'HIGH';
    else if (count > 10) this.state.threatLevel = 'ELEVATED';
    else this.state.threatLevel = 'LOW';
    this.render();
  }

  setDefcon(level: number) {
    this.state.defcon = Math.max(1, Math.min(5, level));
    this.render();
  }

  private render() {
    const defconColor = this.getDefconColor();
    const threatColor = this.getThreatColor();
    const now = new Date();
    const utc = now.toISOString().slice(11, 19);

    this.el.innerHTML = `
      <div class="tb-item tb-defcon" style="border-color: ${defconColor}">
        <span class="tb-label">DEFCON</span>
        <span class="tb-value" style="color: ${defconColor}">${this.state.defcon}</span>
      </div>
      <div class="tb-item tb-threat" style="border-color: ${threatColor}">
        <span class="tb-label">THREAT</span>
        <span class="tb-value" style="color: ${threatColor}">${this.state.threatLevel}</span>
      </div>
      <div class="tb-item">
        <span class="tb-label">EVENTS</span>
        <span class="tb-value">${this.state.conflicts}</span>
      </div>
      <div class="tb-item tb-clock">
        <span class="tb-label">ZULU</span>
        <span class="tb-value tb-time">${utc}Z</span>
      </div>
    `;
  }

  private updateClock() {
    const timeEl = this.el.querySelector('.tb-time');
    if (timeEl) {
      timeEl.textContent = new Date().toISOString().slice(11, 19) + 'Z';
    }
  }

  private getDefconColor(): string {
    switch (this.state.defcon) {
      case 1: return '#ff1744'; // white/nuclear
      case 2: return '#ff3d00';
      case 3: return '#ffea00';
      case 4: return '#00e676';
      case 5: return '#00b0ff';
      default: return '#888';
    }
  }

  private getThreatColor(): string {
    switch (this.state.threatLevel) {
      case 'CRITICAL': return '#ff1744';
      case 'SEVERE': return '#ff3d00';
      case 'HIGH': return '#ff9100';
      case 'ELEVATED': return '#ffea00';
      case 'LOW': return '#00e676';
    }
  }
}
