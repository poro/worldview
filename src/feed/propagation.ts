// ============================================================
// PropagationRenderer — Animated concentric rings showing claim spread
// Uses timer-based fixed updates (NOT CallbackProperty — see git history)
// ============================================================

import * as Cesium from 'cesium';
import { Claim, INFO_EVENT_COLORS } from './types';
import { FEED_CONFIG } from './config';

interface PropagationState {
  claim: Claim;
  entities: Cesium.Entity[];
  currentRadiusKm: number;
  maxRadiusKm: number;
  speedKmPerSec: number;
}

const RING_COUNT = 3;

export class PropagationRenderer {
  private viewer: Cesium.Viewer;
  private propagations: Map<string, PropagationState> = new Map();
  private _visible: boolean = false;
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    // Timer-based update — NOT CallbackProperty (see critical rule #4)
    this.updateTimer = setInterval(() => {
      if (this._visible) {
        this.tick();
      }
    }, FEED_CONFIG.PROPAGATION_UPDATE_INTERVAL_MS);
  }

  get visible(): boolean { return this._visible; }

  setVisible(visible: boolean) {
    this._visible = visible;
    for (const [, state] of this.propagations) {
      for (const entity of state.entities) {
        entity.show = visible;
      }
    }
  }

  startPropagation(claim: Claim) {
    if (this.propagations.has(claim.id)) return;

    const color = Cesium.Color.fromCssColorString(INFO_EVENT_COLORS[claim.infoEventType] || '#E91E63');
    const speedKey = claim.propagation.speed;
    const speedKmPerHr = (FEED_CONFIG.PROPAGATION_SPEEDS as Record<string, number>)[speedKey] || 50;
    const speedKmPerSec = speedKmPerHr / 3600;
    const maxRadius = Math.min(claim.propagationRadius, FEED_CONFIG.PROPAGATION_RING_MAX_RADIUS_KM);

    const entities: Cesium.Entity[] = [];

    this.viewer.entities.suspendEvents();
    try {
      for (let i = 0; i < RING_COUNT; i++) {
        // Each ring has decreasing opacity: inner is denser, outer is faded
        const alpha = FEED_CONFIG.PROPAGATION_RING_OPACITY * (1 - i * 0.3);
        const ringColor = color.withAlpha(alpha);

        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(claim.origin.lon, claim.origin.lat, 0),
          ellipse: {
            semiMajorAxis: 1000, // Start small, grow via tick()
            semiMinorAxis: 1000,
            material: ringColor,
            outline: true,
            outlineColor: color.withAlpha(alpha * 0.5),
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            type: 'feed-propagation',
            claimId: claim.id,
            ringIndex: i,
          },
          show: this._visible,
        });

        entities.push(entity);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }

    this.propagations.set(claim.id, {
      claim,
      entities,
      currentRadiusKm: 1,
      maxRadiusKm: maxRadius,
      speedKmPerSec,
    });
  }

  stopPropagation(claimId: string) {
    const state = this.propagations.get(claimId);
    if (state) {
      for (const entity of state.entities) {
        this.viewer.entities.remove(entity);
      }
      this.propagations.delete(claimId);
    }
  }

  updateAll(currentTime: Date) {
    for (const [, state] of this.propagations) {
      const claimTime = new Date(state.claim.timestamp).getTime();
      const elapsed = (currentTime.getTime() - claimTime) / 1000; // seconds

      if (elapsed < 0) {
        // Claim hasn't appeared yet
        for (const entity of state.entities) {
          entity.show = false;
        }
        continue;
      }

      // Calculate radius based on elapsed time and speed
      const rawRadius = Math.min(elapsed * state.speedKmPerSec, state.maxRadiusKm);
      state.currentRadiusKm = rawRadius;

      // Update each ring
      for (let i = 0; i < state.entities.length; i++) {
        const entity = state.entities[i];
        entity.show = this._visible && rawRadius > 1;

        if (entity.ellipse) {
          // Each ring is at a different fraction of the radius
          const fraction = (i + 1) / RING_COUNT;
          const ringRadiusM = rawRadius * fraction * 1000; // km to meters

          entity.ellipse.semiMajorAxis = new Cesium.ConstantProperty(ringRadiusM);
          entity.ellipse.semiMinorAxis = new Cesium.ConstantProperty(ringRadiusM);
        }
      }
    }
  }

  destroy() {
    if (this.updateTimer) clearInterval(this.updateTimer);
    for (const [, state] of this.propagations) {
      for (const entity of state.entities) {
        this.viewer.entities.remove(entity);
      }
    }
    this.propagations.clear();
  }

  private tick() {
    // Advance all propagation rings by 1 second worth of growth
    for (const [, state] of this.propagations) {
      if (state.currentRadiusKm < state.maxRadiusKm) {
        state.currentRadiusKm = Math.min(
          state.currentRadiusKm + state.speedKmPerSec,
          state.maxRadiusKm
        );

        for (let i = 0; i < state.entities.length; i++) {
          const entity = state.entities[i];
          if (entity.ellipse) {
            const fraction = (i + 1) / RING_COUNT;
            const ringRadiusM = state.currentRadiusKm * fraction * 1000;
            entity.ellipse.semiMajorAxis = new Cesium.ConstantProperty(ringRadiusM);
            entity.ellipse.semiMinorAxis = new Cesium.ConstantProperty(ringRadiusM);
          }
        }
      }
    }
  }
}
