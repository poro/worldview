import * as Cesium from 'cesium';
import { CONFLICT_EVENTS, ConflictEvent } from '../data/events';

const EVENT_TYPE_COLORS: Record<string, string> = {
  kinetic: '#ff3d3d',
  retaliation: '#ffb300',
  civilian_impact: '#ff8c00',
  infrastructure: '#ff6600',
  escalation: '#ff00ff',
  maritime: '#00e5ff',
};

interface CardState {
  event: ConflictEvent;
  div: HTMLElement;
  groundEntity: Cesium.Entity;
  connectorEntity: Cesium.Entity;
}

export class EventCardLayer {
  private viewer: Cesium.Viewer;
  private cards: CardState[] = [];
  private cardContainer: HTMLElement;
  private _visible: boolean = true;
  private _preRenderListener: Cesium.Event.RemoveCallback | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    // Create container for all card divs
    this.cardContainer = document.createElement('div');
    this.cardContainer.id = 'event-card-container';
    this.cardContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:150;';
    document.body.appendChild(this.cardContainer);
  }

  get visible(): boolean { return this._visible; }

  load() {
    this.viewer.entities.suspendEvents();
    try {
      for (const evt of CONFLICT_EVENTS) {
        const color = Cesium.Color.fromCssColorString(EVENT_TYPE_COLORS[evt.type] || '#ffffff');
        const typeClass = evt.type.replace('_', '-');

        // Ground marker point
        const groundEntity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          point: {
            pixelSize: 10,
            color: color.withAlpha(0.9),
            outlineColor: color.withAlpha(0.4),
            outlineWidth: 4,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            type: 'event-card',
            eventId: evt.id,
          },
          show: this._visible,
        });

        // Connector line from ground to label altitude
        const connectorEntity = this.viewer.entities.add({
          polyline: {
            positions: [
              Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
              Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 20000),
            ],
            width: 1,
            material: color.withAlpha(0.3),
          },
          properties: { type: 'event-connector' },
          show: this._visible,
        });

        // HTML card div
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
          ${evt.imageUrl ? `<img class="event-card-thumb" src="${evt.imageUrl}" />` : ''}
        `;
        div.style.display = 'none';
        this.cardContainer.appendChild(div);

        this.cards.push({ event: evt, div, groundEntity, connectorEntity });
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }

    // Start preRender updates
    this._preRenderListener = this.viewer.scene.preRender.addEventListener(() => {
      this.updateCardPositions();
    });
    void this._preRenderListener; // retained for later cleanup
  }

  toggle() {
    this._visible = !this._visible;
    for (const card of this.cards) {
      card.groundEntity.show = this._visible;
      card.connectorEntity.show = this._visible;
      if (!this._visible) card.div.style.display = 'none';
    }
  }

  filterByType(type: string | null) {
    for (const card of this.cards) {
      const show = this._visible && (!type || card.event.type === type);
      card.groundEntity.show = show;
      card.connectorEntity.show = show;
      if (!show) card.div.style.display = 'none';
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
    for (const card of this.cards) {
      if (!card.groundEntity.show) {
        card.div.style.display = 'none';
        continue;
      }

      const worldPos = Cesium.Cartesian3.fromDegrees(card.event.lon, card.event.lat, 0);
      const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, worldPos);

      if (screenPos) {
        // Check if on-screen with some margin
        const w = scene.canvas.clientWidth;
        const h = scene.canvas.clientHeight;
        if (screenPos.x < -100 || screenPos.x > w + 100 || screenPos.y < -100 || screenPos.y > h + 100) {
          card.div.style.display = 'none';
          continue;
        }

        card.div.style.left = `${screenPos.x}px`;
        card.div.style.top = `${screenPos.y - 120}px`;
        card.div.style.display = '';
      } else {
        card.div.style.display = 'none';
      }
    }
  }
}
