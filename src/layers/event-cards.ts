import * as Cesium from 'cesium';
import { CONFLICT_EVENTS } from '../data/events';

const EVENT_TYPE_COLORS: Record<string, string> = {
  kinetic: '#ff3d3d',
  retaliation: '#ffb300',
  civilian_impact: '#ff8c00',
  infrastructure: '#ff6600',
  escalation: '#ff00ff',
  maritime: '#00e5ff',
};

export class EventCardLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private connectorEntities: Map<string, Cesium.Entity> = new Map();
  private _visible: boolean = true;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get visible(): boolean { return this._visible; }

  load() {
    this.viewer.entities.suspendEvents();
    try {
      for (const evt of CONFLICT_EVENTS) {
        const color = Cesium.Color.fromCssColorString(EVENT_TYPE_COLORS[evt.type] || '#ffffff');
        const timeStr = new Date(evt.time).toUTCString().slice(17, 22) + ' UTC';

        // Ground marker point
        const entity = this.viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          point: {
            pixelSize: 10,
            color: color.withAlpha(0.9),
            outlineColor: color.withAlpha(0.4),
            outlineWidth: 4,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: `${evt.type.toUpperCase()}  ${timeStr}\n${evt.title}`,
            font: '10px JetBrains Mono',
            fillColor: color.withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            backgroundColor: Cesium.Color.fromCssColorString('#0a0a0f').withAlpha(0.85),
            showBackground: true,
            backgroundPadding: new Cesium.Cartesian2(8, 5),
            pixelOffset: new Cesium.Cartesian2(0, -30),
            scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 8e6, 0.25),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
          },
          properties: {
            type: 'event-card',
            eventId: evt.id,
          },
          show: this._visible,
        });
        this.entities.set(evt.id, entity);

        // Connector line from ground to label altitude
        const connector = this.viewer.entities.add({
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
        this.connectorEntities.set(evt.id, connector);
      }
    } finally {
      this.viewer.entities.resumeEvents();
    }
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach(e => (e.show = this._visible));
    this.connectorEntities.forEach(e => (e.show = this._visible));
  }

  /** Filter events by type */
  filterByType(type: string | null) {
    for (const evt of CONFLICT_EVENTS) {
      const show = this._visible && (!type || evt.type === type);
      const entity = this.entities.get(evt.id);
      if (entity) entity.show = show;
      const connector = this.connectorEntities.get(evt.id);
      if (connector) connector.show = show;
    }
  }

  handlePick(pickedObject: { id?: Cesium.Entity }): boolean {
    if (pickedObject?.id?.properties?.type) {
      const t = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      return t === 'event-card';
    }
    return false;
  }
}
