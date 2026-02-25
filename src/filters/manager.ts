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

// Default uniform values (normalized 0-1 from the 0-100% slider range)
const DEFAULT_UNIFORMS: Record<string, Record<string, number>> = {
  nightvision: { u_intensity: 0.8, u_noise: 0.5, u_bloom: 0.6, u_vignette: 0.75 },
  flir: { u_sensitivity: 0.5, u_palette: 0, u_pixelation: 0 },
  crt: { u_scanlines: 0.5, u_aberration: 0.5, u_curvature: 0.5, u_flicker: 0.4 },
  enhanced: { u_edgeStrength: 0.5, u_contrast: 0.65, u_saturation: 0.6 },
};

// Maps slider parameter names to shader uniform names
const PARAM_TO_UNIFORM: Record<string, string> = {
  intensity: 'u_intensity',
  noise: 'u_noise',
  bloom: 'u_bloom',
  vignette: 'u_vignette',
  sensitivity: 'u_sensitivity',
  palette: 'u_palette',
  pixelation: 'u_pixelation',
  scanlines: 'u_scanlines',
  aberration: 'u_aberration',
  curvature: 'u_curvature',
  flicker: 'u_flicker',
  edgeStrength: 'u_edgeStrength',
  contrast: 'u_contrast',
  saturation: 'u_saturation',
};

export class FilterManager {
  private viewer: Cesium.Viewer;
  private currentFilter: FilterMode = 'normal';
  private activeStage: Cesium.PostProcessStage | null = null;
  private onChange: ((mode: FilterMode) => void) | null = null;
  private currentUniforms: Record<string, number> = {};

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
      this.currentUniforms = {};
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

    // Get uniforms for this filter
    const uniforms = { ...(DEFAULT_UNIFORMS[mode] || {}) };
    // Override with any currently set values
    for (const key of Object.keys(uniforms)) {
      if (this.currentUniforms[key] !== undefined) {
        uniforms[key] = this.currentUniforms[key];
      }
    }
    this.currentUniforms = uniforms;

    this.activeStage = new Cesium.PostProcessStage({
      fragmentShader,
      uniforms: this.currentUniforms,
      name: `worldview-${mode}`,
    });

    this.viewer.scene.postProcessStages.add(this.activeStage);
    this.onChange?.(mode);
  }

  /** Update shader parameters from slider values (0-100 scale, except palette/pixelation) */
  updateParams(params: Record<string, number>) {
    if (this.currentFilter === 'normal' || !this.activeStage) return;

    for (const [paramName, value] of Object.entries(params)) {
      const uniformName = PARAM_TO_UNIFORM[paramName];
      if (!uniformName) continue;

      // Normalize: palette and pixelation are passed as-is, others are 0-100 -> 0-1
      let normalized: number;
      if (paramName === 'palette' || paramName === 'pixelation') {
        normalized = value;
      } else {
        normalized = value / 100;
      }

      this.currentUniforms[uniformName] = normalized;

      // Update the live uniform on the stage
      if (this.activeStage.uniforms) {
        (this.activeStage.uniforms as any)[uniformName] = normalized;
      }
    }
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
