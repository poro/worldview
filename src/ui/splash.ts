// ============================================================
// Boot Splash — loading screen with progress
// ============================================================

export class BootSplash {
  private el: HTMLElement;
  private statusEl: HTMLElement;
  private progressEl: HTMLElement;
  private steps: string[] = [];
  private current = 0;
  private total = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'boot-splash';
    this.el.innerHTML = `
      <div class="boot-content">
        <div class="boot-logo">WORLDVIEW</div>
        <div class="boot-subtitle">GEOSPATIAL INTELLIGENCE PLATFORM</div>
        <div class="boot-progress-bar">
          <div class="boot-progress-fill"></div>
        </div>
        <div class="boot-status">INITIALIZING...</div>
        <div class="boot-version">v1.1 — Endless Games & Learning Lab</div>
      </div>
    `;
    this.statusEl = this.el.querySelector('.boot-status')!;
    this.progressEl = this.el.querySelector('.boot-progress-fill')!;
    document.body.appendChild(this.el);
  }

  setSteps(total: number) {
    this.total = total;
    this.current = 0;
  }

  step(message: string) {
    this.current++;
    this.steps.push(message);
    this.statusEl.textContent = message;
    const pct = Math.min(100, (this.current / this.total) * 100);
    this.progressEl.style.width = `${pct}%`;
  }

  done() {
    this.statusEl.textContent = 'ALL SYSTEMS ONLINE';
    this.progressEl.style.width = '100%';
    setTimeout(() => {
      this.el.style.opacity = '0';
      setTimeout(() => this.el.remove(), 500);
    }, 800);
  }

  error(message: string) {
    this.statusEl.textContent = `⚠ ${message}`;
    this.statusEl.style.color = '#ff9100';
  }
}
