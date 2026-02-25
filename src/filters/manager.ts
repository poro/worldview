import * as Cesium from 'cesium';
import { nightVisionFS, flirFS, crtFS, enhancedFS } from './shaders';

export type FilterMode = 'normal' | 'nightvision' | 'flir' | 'crt' | 'enhanced';

const FILTER_NAMES: Record<FilterMode, string> = {
  normal: 'NORMAL',
  nightvision: 'NIGHT VISION',
  flir: 'FLIR / THERMAL',
  crt: 'CRT',
  enhanced: 'ENHANCED',
};

export class FilterManager {
  private viewer: Cesium.Viewer;
  private currentFilter: FilterMode = 'normal';
  private activeStage: Cesium.PostProcessStage | null = null;
  private onChange: ((mode: FilterMode) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get mode(): FilterMode {
    return this.currentFilter;
  }

  get modeName(): string {
    return FILTER_NAMES[this.currentFilter];
  }

  setOnChange(cb: (mode: FilterMode) => void) {
    this.onChange = cb;
  }

  setFilter(mode: FilterMode) {
    // Remove current
    if (this.activeStage) {
      this.viewer.scene.postProcessStages.remove(this.activeStage);
      this.activeStage = null;
    }

    this.currentFilter = mode;

    if (mode === 'normal') {
      this.onChange?.(mode);
      return;
    }

    const shaderMap: Record<string, string> = {
      nightvision: nightVisionFS,
      flir: flirFS,
      crt: crtFS,
      enhanced: enhancedFS,
    };

    const fragmentShader = shaderMap[mode];
    if (!fragmentShader) return;

    this.activeStage = new Cesium.PostProcessStage({
      fragmentShader,
      name: `worldview-${mode}`,
    });

    this.viewer.scene.postProcessStages.add(this.activeStage);
    this.onChange?.(mode);
  }

  cycle() {
    const modes: FilterMode[] = ['normal', 'nightvision', 'flir', 'crt', 'enhanced'];
    const idx = modes.indexOf(this.currentFilter);
    const next = modes[(idx + 1) % modes.length];
    this.setFilter(next);
  }

  setByIndex(index: number) {
    const modes: FilterMode[] = ['normal', 'nightvision', 'flir', 'crt', 'enhanced'];
    if (index >= 0 && index < modes.length) {
      this.setFilter(modes[index]);
    }
  }
}
