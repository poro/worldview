import * as Cesium from 'cesium';

/**
 * Zoom controls for WorldView — optimized for Mac trackpad
 * - Floating +/- buttons (bottom right)
 * - Double-tap to zoom in
 * - Smooth zoom with trackpad pinch
 * - Keyboard +/- support
 * - Location preset buttons for quick jumps
 */

const ZOOM_FACTOR = 0.4; // 40% per click
const SMOOTH_ZOOM_DURATION = 0.5; // seconds

interface ZoomPreset {
  label: string;
  emoji: string;
  lon: number;
  lat: number;
  height: number;
  key?: string;
}

const ZOOM_PRESETS: ZoomPreset[] = [
  { label: 'Iran Theater', emoji: '🎯', lon: 53, lat: 32, height: 3000000, key: 'P' },
  { label: 'Strait of Hormuz', emoji: '🚢', lon: 56.3, lat: 26.5, height: 300000 },
  { label: 'Tehran', emoji: '💥', lon: 51.4, lat: 35.7, height: 150000 },
  { label: 'Kuwait', emoji: '✈️', lon: 48.0, lat: 29.4, height: 200000 },
  { label: 'Cyprus', emoji: '🇨🇾', lon: 33.4, lat: 35.1, height: 300000 },
  { label: 'Global', emoji: '🌍', lon: 30, lat: 20, height: 20000000 },
];

export class ZoomControls {
  private viewer: Cesium.Viewer;
  private container: HTMLDivElement;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.container = document.createElement('div');
    this.container.className = 'wv-zoom-controls';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    this.bindEvents();
    this.improveTouchpad();
  }

  private buildHTML(): string {
    const presetButtons = ZOOM_PRESETS.map(
      (p, i) => `<button class="wv-zoom-preset" data-idx="${i}" title="${p.label}${p.key ? ` (${p.key})` : ''}">${p.emoji}</button>`
    ).join('');

    return `
      <div class="wv-zoom-buttons">
        <button class="wv-zoom-btn" id="wv-zoom-in" title="Zoom In (+)">+</button>
        <button class="wv-zoom-btn" id="wv-zoom-out" title="Zoom Out (−)">−</button>
      </div>
      <div class="wv-zoom-presets">
        ${presetButtons}
      </div>
    `;
  }

  private bindEvents() {
    this.container.querySelector('#wv-zoom-in')!.addEventListener('click', () => this.zoomIn());
    this.container.querySelector('#wv-zoom-out')!.addEventListener('click', () => this.zoomOut());

    // Preset buttons
    this.container.querySelectorAll('.wv-zoom-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        const preset = ZOOM_PRESETS[idx];
        this.flyTo(preset.lon, preset.lat, preset.height);
      });
    });

    // Keyboard +/- zoom
    document.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); this.zoomIn(); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); this.zoomOut(); }
    });

    // Double-click to zoom in
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const cartesian = this.viewer.camera.pickEllipsoid(click.position);
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const currentHeight = this.viewer.camera.positionCartographic.height;
        this.flyTo(
          Cesium.Math.toDegrees(carto.longitude),
          Cesium.Math.toDegrees(carto.latitude),
          currentHeight * (1 - ZOOM_FACTOR)
        );
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  private improveTouchpad() {
    const scene = this.viewer.scene;

    // Increase zoom sensitivity for trackpad
    scene.screenSpaceCameraController.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
    ];

    // Smooth tilt with two-finger drag (right-click emulation on Mac)
    scene.screenSpaceCameraController.tiltEventTypes = [
      Cesium.CameraEventType.MIDDLE_DRAG,
      Cesium.CameraEventType.PINCH,
      { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
      { eventType: Cesium.CameraEventType.RIGHT_DRAG, modifier: undefined },
    ];

    // Pan with single finger/click drag
    scene.screenSpaceCameraController.rotateEventTypes = [
      Cesium.CameraEventType.LEFT_DRAG,
    ];

    // Speed adjustments for smooth trackpad feel
    scene.screenSpaceCameraController.minimumZoomDistance = 100;
    scene.screenSpaceCameraController.maximumZoomDistance = 50000000;
    (scene.screenSpaceCameraController as any)._zoomFactor = 3.0;

    // Inertia for smooth deceleration
    scene.screenSpaceCameraController.inertiaSpin = 0.9;
    scene.screenSpaceCameraController.inertiaTranslate = 0.9;
    scene.screenSpaceCameraController.inertiaZoom = 0.8;
  }

  private zoomIn() {
    const camera = this.viewer.camera;
    const currentHeight = camera.positionCartographic.height;
    const newHeight = Math.max(100, currentHeight * (1 - ZOOM_FACTOR));
    camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        newHeight
      ),
      duration: SMOOTH_ZOOM_DURATION,
    });
  }

  private zoomOut() {
    const camera = this.viewer.camera;
    const currentHeight = camera.positionCartographic.height;
    const newHeight = Math.min(50000000, currentHeight * (1 + ZOOM_FACTOR));
    camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        newHeight
      ),
      duration: SMOOTH_ZOOM_DURATION,
    });
  }

  private flyTo(lon: number, lat: number, height: number) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      duration: 1.5,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }
}
