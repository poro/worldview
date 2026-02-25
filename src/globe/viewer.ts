import * as Cesium from 'cesium';

const GOOGLE_3D_TILES_URL = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=AIzaSyAnzzz4pUfC19xLvX9wCN2YWnkJIHdOdAY';

let google3DTileset: Cesium.Cesium3DTileset | null = null;
let google3DEnabled = true;

export function createViewer(): Cesium.Viewer {
  // Placeholder token — replace with real Cesium Ion token
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3YjliNzI2NS1mYmFjLTRjYTUtYTc5Ny01NjRlNGU3NzA1YWYiLCJpZCI6Mzk0MDk5LCJpYXQiOjE3NzIwMDYzODZ9.ouPT_EQ7AnbLJ7ub5m5culWUOolidQmarMGVYNVdO6Y';

  const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    geocoder: false,
    fullscreenButton: false,
    vrButton: false,
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 18,
        credit: new Cesium.Credit('OpenStreetMap'),
      })
    ),
    terrain: undefined,
    msaaSamples: 4,
  });

  // Dark globe styling
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#05050a');
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a14');
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.0002;
  viewer.scene.fog.screenSpaceErrorFactor = 4;

  // Atmosphere
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.hueShift = -0.05;
    viewer.scene.skyAtmosphere.saturationShift = -0.4;
    viewer.scene.skyAtmosphere.brightnessShift = -0.3;
  }

  // Globe rendering
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.dynamicAtmosphereLighting = true;
  viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
  viewer.scene.globe.showGroundAtmosphere = true;

  // High DPI rendering
  viewer.resolutionScale = window.devicePixelRatio || 1;

  // Disable depth test against terrain for entities
  viewer.scene.globe.depthTestAgainstTerrain = false;

  // Sky box — dark
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = true;
  if (viewer.scene.sun) viewer.scene.sun.show = true;
  if (viewer.scene.moon) viewer.scene.moon.show = true;

  return viewer;
}

// Google 3D Tiles management
export async function initGoogle3DTiles(viewer: Cesium.Viewer): Promise<void> {
  try {
    google3DTileset = await Cesium.Cesium3DTileset.fromUrl(GOOGLE_3D_TILES_URL, {
      showCreditsOnScreen: true,
    });
    viewer.scene.primitives.add(google3DTileset);
    // Hide globe when Google 3D is active to avoid z-fighting
    viewer.scene.globe.show = false;
    google3DEnabled = true;
    console.log('[WORLDVIEW] Google 3D Tiles loaded');
  } catch (err) {
    console.warn('[WORLDVIEW] Google 3D Tiles failed to load, falling back to standard:', err);
    google3DEnabled = false;
    viewer.scene.globe.show = true;
  }
}

export function toggleGoogle3D(viewer: Cesium.Viewer): boolean {
  if (!google3DTileset) return false;
  google3DEnabled = !google3DEnabled;
  google3DTileset.show = google3DEnabled;
  viewer.scene.globe.show = !google3DEnabled;
  return google3DEnabled;
}

export function isGoogle3DEnabled(): boolean {
  return google3DEnabled;
}

export function flyToLocation(
  viewer: Cesium.Viewer,
  lon: number,
  lat: number,
  alt: number = 15000000,
  duration: number = 2
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    duration,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });
}

export function flyToCinematic(
  viewer: Cesium.Viewer,
  lon: number,
  lat: number,
  alt: number = 800,
  duration: number = 2
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    duration,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
  });
}

export function getCameraPosition(viewer: Cesium.Viewer) {
  const pos = viewer.camera.positionCartographic;
  return {
    lon: Cesium.Math.toDegrees(pos.longitude),
    lat: Cesium.Math.toDegrees(pos.latitude),
    alt: pos.height,
  };
}

export function getMouseCoords(viewer: Cesium.Viewer, position: Cesium.Cartesian2): { lat: number; lon: number; alt: number } | null {
  const ray = viewer.camera.getPickRay(position);
  if (!ray) return null;
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (!cartesian) return null;
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    alt: carto.height,
  };
}
