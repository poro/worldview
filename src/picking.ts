// ============================================================
// Entity Picking — click handler with layer registry
// ============================================================

import * as Cesium from 'cesium';
import { bus } from './bus';

export interface PickableLayer {
  handlePick(picked: any): boolean;
}

const layers: PickableLayer[] = [];

/** Register a layer that can handle entity picks. Order matters — first match wins. */
export function registerPickable(layer: PickableLayer) {
  layers.push(layer);
}

/** Initialize the pick handler on the viewer. */
export function initPicking(viewer: Cesium.Viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
    const picked = viewer.scene.pick(click.position);
    if (picked) {
      for (const layer of layers) {
        if (layer.handlePick(picked)) return;
      }
    }
    // Clicked empty space — deselect all
    bus.emit('entity:deselect');
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
