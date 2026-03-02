// ============================================
// View Modes — Normal / Tactical / Night Vision
// ============================================

export type ViewMode = 'normal' | 'tactical' | 'nightvision';

export class ViewModeManager {
  private currentMode: ViewMode = 'normal';
  private crtOverlay: HTMLElement | null = null;

  constructor() {
    this.crtOverlay = document.querySelector('.crt-overlay');
  }

  get mode(): ViewMode { return this.currentMode; }

  setMode(mode: ViewMode) {
    this.currentMode = mode;
    this.applyMode();
  }

  cycle(): ViewMode {
    const modes: ViewMode[] = ['normal', 'tactical', 'nightvision'];
    const idx = modes.indexOf(this.currentMode);
    const next = modes[(idx + 1) % modes.length];
    this.setMode(next);
    return next;
  }

  private applyMode() {
    const container = document.getElementById('cesiumContainer');
    if (!container) return;

    // Reset
    container.style.filter = '';
    if (this.crtOverlay) {
      this.crtOverlay.style.display = '';
      this.crtOverlay.style.background = '';
    }

    switch (this.currentMode) {
      case 'normal':
        break;

      case 'tactical':
        container.style.filter = 'contrast(1.15) saturate(0.7) brightness(0.9)';
        break;

      case 'nightvision':
        container.style.filter = 'saturate(0) brightness(0.8) sepia(1) hue-rotate(70deg) saturate(3)';
        // Enhance CRT overlay for night vision
        if (this.crtOverlay) {
          this.crtOverlay.style.background = `repeating-linear-gradient(
            0deg,
            rgba(0, 20, 0, 0.06) 0px,
            rgba(0, 20, 0, 0.06) 1px,
            transparent 1px,
            transparent 2px
          )`;
        }
        break;
    }
  }
}
