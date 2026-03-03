import * as Cesium from 'cesium';
import { CONFLICT_EVENTS, ConflictEvent } from '../data/events';

const EVENT_TYPE_COLORS: Record<string, string> = {
  kinetic: '#ff3d3d',
  retaliation: '#ffb300',
  civilian_impact: '#ff8c00',
  infrastructure: '#ff6600',
  escalation: '#ff00ff',
  maritime: '#00e5ff',
  intelligence: '#00ff88',
  cyber: '#aa00ff',
};

interface CardState {
  event: ConflictEvent;
  div: HTMLElement;
  groundEntity: Cesium.Entity;
  connectorEntity: Cesium.Entity;
  expanded: boolean;
}

// Max cards visible at once to prevent clutter
const MAX_VISIBLE_CARDS = 4;
// Min screen distance between cards before hiding overlaps (pixels)
const MIN_CARD_SPACING = 150;

export class EventCardLayer {
  private viewer: Cesium.Viewer;
  private cards: CardState[] = [];
  private cardContainer: HTMLElement;
  private _visible: boolean = true;
  private selectedId: string | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    this.cardContainer = document.createElement('div');
    this.cardContainer.id = 'event-card-container';
    this.cardContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:150;overflow:hidden;';
    document.body.appendChild(this.cardContainer);
  }

  get visible(): boolean { return this._visible; }

  load() {
    this.viewer.entities.suspendEvents();
    try {
      for (const evt of CONFLICT_EVENTS) {
        const color = Cesium.Color.fromCssColorString(EVENT_TYPE_COLORS[evt.type] || '#ffffff');
        const typeClass = evt.type.replace('_', '-');

        // Ground marker — clickable dot
        const groundEntity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          point: {
            pixelSize: 8,
            color: color.withAlpha(0.9),
            outlineColor: color.withAlpha(0.4),
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: evt.title,
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
            type: 'event-card',
            eventId: evt.id,
          },
          show: this._visible,
        });

        // Connector line
        const connectorEntity = this.viewer.entities.add({
          polyline: {
            positions: [
              Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
              Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 15000),
            ],
            width: 1,
            material: color.withAlpha(0.2),
          },
          properties: { type: 'event-connector' },
          show: false, // Only show when card is expanded
        });

        // Compact HTML card — only shown when selected or auto-featured
        const timeStr = new Date(evt.time).toUTCString().slice(17, 22) + ' UTC';
        const div = document.createElement('div');
        div.className = 'event-card';
        div.innerHTML = `
          <div class="event-card-header">
            <span class="event-type-badge ${typeClass}">${evt.type.replace('_', ' ').toUpperCase()}</span>
            <span class="event-time">${timeStr}</span>
          </div>
          <div class="event-card-title">${evt.title}</div>
          <div class="event-card-desc">${evt.description}</div>
        `;
        div.style.display = 'none';
        this.cardContainer.appendChild(div);

        this.cards.push({ event: evt, div, groundEntity, connectorEntity, expanded: false });
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }

    // Update positions each frame
    this.viewer.scene.preRender.addEventListener(() => {
      this.updateCardPositions();
    });

    // Click handler to expand/collapse cards
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = this.viewer.scene.pick(click.position);
      if (picked?.id?.properties?.eventId) {
        const id = picked.id.properties.eventId.getValue(Cesium.JulianDate.now());
        this.toggleCard(id);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  private toggleCard(eventId: string) {
    if (this.selectedId === eventId) {
      // Deselect
      this.selectedId = null;
      for (const card of this.cards) {
        card.expanded = false;
        card.connectorEntity.show = false;
      }
    } else {
      // Select this card, deselect others
      this.selectedId = eventId;
      for (const card of this.cards) {
        card.expanded = card.event.id === eventId;
        card.connectorEntity.show = card.expanded;
      }
    }
  }

  toggle() {
    this._visible = !this._visible;
    for (const card of this.cards) {
      card.groundEntity.show = this._visible;
      card.connectorEntity.show = this._visible && card.expanded;
      if (!this._visible) card.div.style.display = 'none';
    }
  }

  filterByType(type: string | null) {
    for (const card of this.cards) {
      const show = this._visible && (!type || card.event.type === type);
      card.groundEntity.show = show;
      if (!show) {
        card.div.style.display = 'none';
        card.connectorEntity.show = false;
      }
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const t = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      return t === 'event-card';
    }
    return false;
  }

  private updateCardPositions() {
    if (!this._visible) return;

    const scene = this.viewer.scene;
    const w = scene.canvas.clientWidth;
    const h = scene.canvas.clientHeight;

    // Calculate screen positions for all visible cards
    const positioned: { card: CardState; x: number; y: number; dist: number }[] = [];

    for (const card of this.cards) {
      if (!card.groundEntity.show) {
        card.div.style.display = 'none';
        continue;
      }

      const worldPos = Cesium.Cartesian3.fromDegrees(card.event.lon, card.event.lat, 0);
      const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, worldPos);

      if (!screenPos || screenPos.x < -50 || screenPos.x > w + 50 || screenPos.y < -50 || screenPos.y > h + 50) {
        card.div.style.display = 'none';
        continue;
      }

      // Camera distance to this point
      const camPos = scene.camera.positionWC;
      const dist = Cesium.Cartesian3.distance(camPos, worldPos);

      positioned.push({ card, x: screenPos.x, y: screenPos.y, dist });
    }

    // Sort by distance (closest first)
    positioned.sort((a, b) => a.dist - b.dist);

    // Show expanded cards always, then fill remaining slots with closest events
    const shownPositions: { x: number; y: number }[] = [];
    let shownCount = 0;

    for (const p of positioned) {
      const isExpanded = p.card.expanded;

      // Check overlap with already-shown cards
      const overlaps = shownPositions.some(sp =>
        Math.abs(sp.x - p.x) < MIN_CARD_SPACING && Math.abs(sp.y - p.y) < MIN_CARD_SPACING
      );

      if (isExpanded || (!overlaps && shownCount < MAX_VISIBLE_CARDS)) {
        p.card.div.style.left = `${p.x}px`;
        p.card.div.style.top = `${p.y - 90}px`;
        p.card.div.style.display = '';
        p.card.div.style.transform = 'translateX(-50%)';
        shownPositions.push({ x: p.x, y: p.y });
        if (!isExpanded) shownCount++;
      } else {
        p.card.div.style.display = 'none';
      }
    }
  }
}
