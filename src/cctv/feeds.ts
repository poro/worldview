import * as Cesium from 'cesium';

export interface CameraFeed {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  url: string;
  type: 'iframe' | 'img';
  refreshInterval?: number; // seconds for img refresh
}

// Hardcoded public camera feeds with known locations
export const CAMERA_FEEDS: CameraFeed[] = [
  {
    id: 'times-square',
    name: 'Times Square',
    location: 'New York, NY',
    lat: 40.758,
    lon: -73.9855,
    url: 'https://www.earthcam.com/cams/newyork/timessquare/?cam=tsrobo1',
    type: 'iframe',
  },
  {
    id: 'abbey-road',
    name: 'Abbey Road',
    location: 'London, UK',
    lat: 51.532,
    lon: -0.178,
    url: 'https://www.abbeyroad.com/crossing',
    type: 'iframe',
  },
  {
    id: 'shibuya',
    name: 'Shibuya Crossing',
    location: 'Tokyo, Japan',
    lat: 35.6595,
    lon: 139.7004,
    url: 'https://www.youtube.com/embed/3n6Ra-K7us8?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'jackson-hole',
    name: 'Town Square',
    location: 'Jackson Hole, WY',
    lat: 43.4799,
    lon: -110.7624,
    url: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'austin-tx',
    name: 'Congress Ave Bridge',
    location: 'Austin, TX',
    lat: 30.2622,
    lon: -97.7454,
    url: 'https://www.youtube.com/embed/WDHR4lCcsZs?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'hollywood-sign',
    name: 'Hollywood Sign',
    location: 'Los Angeles, CA',
    lat: 34.1341,
    lon: -118.3215,
    url: 'https://www.youtube.com/embed/MPRIQ-9MgwI?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'miami-beach',
    name: 'South Beach',
    location: 'Miami, FL',
    lat: 25.7826,
    lon: -80.1341,
    url: 'https://www.youtube.com/embed/vCadcBR95oU?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'iss-live',
    name: 'ISS Earth View',
    location: 'Low Earth Orbit',
    lat: 28.5721,
    lon: -80.648,
    url: 'https://www.youtube.com/embed/P9C25Un7xaM?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'dublin',
    name: "O'Connell Street",
    location: 'Dublin, Ireland',
    lat: 53.3498,
    lon: -6.2603,
    url: 'https://www.youtube.com/embed/eVMbEz-RM24?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'venice',
    name: 'Rialto Bridge',
    location: 'Venice, Italy',
    lat: 45.438,
    lon: 12.336,
    url: 'https://www.youtube.com/embed/vPbQcM4k1Ys?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'prague',
    name: 'Old Town Square',
    location: 'Prague, Czech Republic',
    lat: 50.087,
    lon: 14.4213,
    url: 'https://www.youtube.com/embed/d1VBMaOHpIg?autoplay=1&mute=1',
    type: 'iframe',
  },
  {
    id: 'niagara',
    name: 'Niagara Falls',
    location: 'Niagara Falls, NY',
    lat: 43.0896,
    lon: -79.0849,
    url: 'https://www.youtube.com/embed/mAGqplGiRGQ?autoplay=1&mute=1',
    type: 'iframe',
  },
];

const CAMERA_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`)}`;

export class CCTVLayer {
  private viewer: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private _visible: boolean = true;
  private activePanel: HTMLElement | null = null;
  private activeFeedId: string | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.render();
  }

  get visible(): boolean {
    return this._visible;
  }

  get feedCount(): number {
    return CAMERA_FEEDS.length;
  }

  toggle() {
    this._visible = !this._visible;
    this.entities.forEach((e) => (e.show = this._visible));
    if (!this._visible) this.closeFeedPanel();
  }

  handlePick(pickedObject: any): boolean {
    if (pickedObject?.id?.properties?.type) {
      const type = pickedObject.id.properties.type.getValue(Cesium.JulianDate.now());
      if (type === 'cctv') {
        const camId = pickedObject.id.properties.camId.getValue(Cesium.JulianDate.now());
        const feed = CAMERA_FEEDS.find((f) => f.id === camId);
        if (feed) this.showFeedPanel(feed);
        return true;
      }
    }
    return false;
  }

  closeFeedPanel() {
    if (this.activePanel) {
      this.activePanel.remove();
      this.activePanel = null;
      this.activeFeedId = null;
    }
  }

  showFeedPanel(feed: CameraFeed) {
    this.closeFeedPanel();
    this.activeFeedId = feed.id;

    const panel = document.createElement('div');
    panel.className = 'cctv-feed-panel fade-in';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: auto;
    `;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    panel.innerHTML = `
      <div class="cmd-panel rounded-sm" style="width: 520px; border-color: rgba(0, 229, 255, 0.3);">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-400 pulse-dot"></div>
            <span class="text-[10px] tracking-widest text-cyan-400 glow-cyan uppercase">LIVE FEED</span>
          </div>
          <button class="cctv-close text-gray-500 hover:text-cyan-400 text-xs transition-colors pointer-events-auto">✕</button>
        </div>
        <div class="relative bg-black" style="height: 300px;">
          ${feed.type === 'iframe' ? `
            <iframe src="${feed.url}" style="width:100%;height:100%;border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          ` : `
            <img src="${feed.url}" style="width:100%;height:100%;object-fit:cover;" alt="${feed.name}" />
          `}
          <div class="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded-sm">
            <div class="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot"></div>
            <span class="text-[9px] text-red-400 tracking-wider font-semibold">REC</span>
          </div>
          <div class="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-sm">
            <span class="text-[9px] text-gray-400 font-mono">${timeStr}</span>
          </div>
        </div>
        <div class="px-4 py-2.5 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-cyan-400 text-xs font-semibold tracking-wide">${feed.name}</span>
            <span class="text-[9px] text-gray-500">${feed.id.toUpperCase()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-gray-400">${feed.location}</span>
            <span class="text-[9px] text-gray-600">${feed.lat.toFixed(4)}°, ${feed.lon.toFixed(4)}°</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.activePanel = panel;

    const closeBtn = panel.querySelector('.cctv-close')!;
    closeBtn.addEventListener('click', () => this.closeFeedPanel());

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeFeedPanel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  private render() {
    for (const feed of CAMERA_FEEDS) {
      const entity = this.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(feed.lon, feed.lat, 0),
        billboard: {
          image: CAMERA_SVG,
          width: 24,
          height: 24,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 1e7, 0.5),
          translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 2e7, 0.4),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: feed.name,
          font: '10px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#00e5ff'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.0),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e6),
        },
        properties: {
          type: 'cctv',
          camId: feed.id,
        },
        show: this._visible,
      });

      this.entities.set(feed.id, entity);
    }
  }
}
