// ============================================================
// ClaimRenderer — Renders claims as Cesium entities on the globe
// Follows the pattern in src/layers/event-cards.ts
// ============================================================

import * as Cesium from 'cesium';
import { Claim, INFO_EVENT_COLORS, InfoEventType, SeverityTier } from './types';
import { FEED_CONFIG } from './config';

interface ClaimEntityState {
  claim: Claim;
  entity: Cesium.Entity;
  cardDiv: HTMLElement;
  visible: boolean;
}

const SEVERITY_SIZES: Record<SeverityTier, number> = {
  critical: 14,
  high: 12,
  moderate: 10,
  low: 8,
  benign: 6,
};

export class ClaimRenderer {
  private viewer: Cesium.Viewer;
  private claims: Map<string, ClaimEntityState> = new Map();
  private cardContainer: HTMLElement;
  private _visible: boolean = false;
  private highlightedId: string | null = null;
  private onClaimClick: ((claimId: string) => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    this.cardContainer = document.createElement('div');
    this.cardContainer.id = 'feed-claim-cards';
    this.cardContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:155;overflow:hidden;';
    document.body.appendChild(this.cardContainer);
  }

  get visible(): boolean { return this._visible; }

  setOnClaimClick(cb: (claimId: string) => void) {
    this.onClaimClick = cb;
  }

  addClaim(claim: Claim): Cesium.Entity {
    const color = Cesium.Color.fromCssColorString(INFO_EVENT_COLORS[claim.infoEventType] || '#ffffff');
    const pixelSize = SEVERITY_SIZES[claim.severityTier] || 10;

    const entity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(claim.origin.lon, claim.origin.lat, 0),
      point: {
        pixelSize,
        color: color.withAlpha(0.9),
        outlineColor: color.withAlpha(0.4),
        outlineWidth: 3,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: claim.id,
        font: '9px JetBrains Mono',
        fillColor: color.withAlpha(0.7),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(12, 0),
        scaleByDistance: new Cesium.NearFarScalar(5e5, 0.8, 5e6, 0.0),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e6),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        show: true,
      },
      properties: {
        type: 'feed-claim',
        claimId: claim.id,
      },
      show: false,
    });

    // HTML overlay card
    const div = document.createElement('div');
    div.className = 'feed-claim-card';
    div.innerHTML = this.buildClaimCard(claim);
    div.style.display = 'none';
    div.style.pointerEvents = 'auto';
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => {
      this.onClaimClick?.(claim.id);
    });
    this.cardContainer.appendChild(div);

    this.claims.set(claim.id, { claim, entity, cardDiv: div, visible: false });
    return entity;
  }

  removeClaim(claimId: string) {
    const state = this.claims.get(claimId);
    if (state) {
      this.viewer.entities.remove(state.entity);
      state.cardDiv.remove();
      this.claims.delete(claimId);
    }
  }

  updateVisibility(currentTime: Date) {
    const currentMs = currentTime.getTime();

    for (const [, state] of this.claims) {
      const claimMs = new Date(state.claim.timestamp).getTime();
      const shouldShow = this._visible && claimMs <= currentMs;
      state.entity.show = shouldShow;
      state.visible = shouldShow;

      if (!shouldShow) {
        state.cardDiv.style.display = 'none';
      }
    }

    this.updateCardPositions();
  }

  highlightClaim(claimId: string) {
    this.clearHighlight();
    this.highlightedId = claimId;
    const state = this.claims.get(claimId);
    if (state) {
      const color = Cesium.Color.fromCssColorString(INFO_EVENT_COLORS[state.claim.infoEventType] || '#ffffff');
      if (state.entity.point) {
        state.entity.point.pixelSize = new Cesium.ConstantProperty(SEVERITY_SIZES[state.claim.severityTier] * 2);
        state.entity.point.outlineWidth = new Cesium.ConstantProperty(5);
        state.entity.point.outlineColor = new Cesium.ConstantProperty(color);
      }
    }
  }

  clearHighlight() {
    if (this.highlightedId) {
      const state = this.claims.get(this.highlightedId);
      if (state) {
        const color = Cesium.Color.fromCssColorString(INFO_EVENT_COLORS[state.claim.infoEventType] || '#ffffff');
        if (state.entity.point) {
          state.entity.point.pixelSize = new Cesium.ConstantProperty(SEVERITY_SIZES[state.claim.severityTier]);
          state.entity.point.outlineWidth = new Cesium.ConstantProperty(3);
          state.entity.point.outlineColor = new Cesium.ConstantProperty(color.withAlpha(0.4));
        }
      }
      this.highlightedId = null;
    }
  }

  toggle() {
    this._visible = !this._visible;
    for (const [, state] of this.claims) {
      if (!this._visible) {
        state.entity.show = false;
        state.cardDiv.style.display = 'none';
      }
    }
  }

  setVisible(visible: boolean) {
    this._visible = visible;
    if (!visible) {
      for (const [, state] of this.claims) {
        state.entity.show = false;
        state.cardDiv.style.display = 'none';
      }
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const t = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (t === 'feed-claim') {
        const claimId = pickedObject.id.properties.claimId.getValue(Cesium.JulianDate.now());
        this.onClaimClick?.(claimId);
        return true;
      }
    }
    return false;
  }

  getClaimIds(): string[] {
    return Array.from(this.claims.keys());
  }

  getClaim(claimId: string): Claim | undefined {
    return this.claims.get(claimId)?.claim;
  }

  getVisibleCount(): number {
    let count = 0;
    for (const [, state] of this.claims) {
      if (state.visible) count++;
    }
    return count;
  }

  destroy() {
    for (const [, state] of this.claims) {
      this.viewer.entities.remove(state.entity);
      state.cardDiv.remove();
    }
    this.claims.clear();
    this.cardContainer.remove();
  }

  private buildClaimCard(claim: Claim): string {
    const color = INFO_EVENT_COLORS[claim.infoEventType] || '#ffffff';
    const typeLabel = claim.infoEventType.replace(/_/g, ' ').toUpperCase();
    const severityClass = claim.severityTier;
    const reachStr = this.formatReach(claim.reach.estimatedImpressions);
    const timeStr = new Date(claim.timestamp).toUTCString().slice(17, 22) + ' UTC';

    return `
      <div class="feed-card-inner" style="border-left: 3px solid ${color}; max-width: ${FEED_CONFIG.CLAIM_CARD_MAX_WIDTH_PX}px;">
        <div class="feed-card-header">
          <span class="feed-type-badge" style="color:${color}">${typeLabel}</span>
          <span class="feed-time">${timeStr}</span>
        </div>
        <div class="feed-card-headline">${claim.headline}</div>
        <div class="feed-card-meta">
          <span class="feed-source">${claim.source.name} (${claim.source.country})</span>
          <span class="feed-reach">${reachStr}</span>
        </div>
        <div class="feed-card-badges">
          <span class="feed-severity-badge ${severityClass}">${claim.severityTier.toUpperCase()}</span>
        </div>
      </div>
    `;
  }

  private formatReach(impressions: number): string {
    if (impressions >= 1000000000) return `${(impressions / 1000000000).toFixed(1)}B`;
    if (impressions >= 1000000) return `${(impressions / 1000000).toFixed(0)}M`;
    if (impressions >= 1000) return `${(impressions / 1000).toFixed(0)}K`;
    return String(impressions);
  }

  private updateCardPositions() {
    if (!this._visible) return;

    const scene = this.viewer.scene;
    const w = scene.canvas.clientWidth;
    const h = scene.canvas.clientHeight;

    const positioned: { state: ClaimEntityState; x: number; y: number; dist: number }[] = [];

    for (const [, state] of this.claims) {
      if (!state.visible) {
        state.cardDiv.style.display = 'none';
        continue;
      }

      const worldPos = Cesium.Cartesian3.fromDegrees(state.claim.origin.lon, state.claim.origin.lat, 0);
      const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, worldPos);

      if (!screenPos || screenPos.x < -50 || screenPos.x > w + 50 || screenPos.y < -50 || screenPos.y > h + 50) {
        state.cardDiv.style.display = 'none';
        continue;
      }

      const camPos = scene.camera.positionWC;
      const dist = Cesium.Cartesian3.distance(camPos, worldPos);
      positioned.push({ state, x: screenPos.x, y: screenPos.y, dist });
    }

    positioned.sort((a, b) => a.dist - b.dist);

    const shownPositions: { x: number; y: number }[] = [];
    let shownCount = 0;
    const maxCards = 4;
    const minSpacing = 120;

    for (const p of positioned) {
      const isHighlighted = p.state.claim.id === this.highlightedId;
      const overlaps = shownPositions.some(sp =>
        Math.abs(sp.x - p.x) < minSpacing && Math.abs(sp.y - p.y) < minSpacing
      );

      if (isHighlighted || (!overlaps && shownCount < maxCards)) {
        p.state.cardDiv.style.left = `${p.x}px`;
        p.state.cardDiv.style.top = `${p.y - 80}px`;
        p.state.cardDiv.style.display = '';
        p.state.cardDiv.style.transform = 'translateX(-50%)';
        shownPositions.push({ x: p.x, y: p.y });
        if (!isHighlighted) shownCount++;
      } else {
        p.state.cardDiv.style.display = 'none';
      }
    }
  }
}
