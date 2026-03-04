// ============================================================
// Search — location geocoding and navigation
// ============================================================

import * as Cesium from 'cesium';
import { flyToLocation } from './globe/viewer';

const LOCATIONS: Record<string, [number, number]> = {
  'washington': [-77.0369, 38.9072],
  'dc': [-77.0369, 38.9072],
  'new york': [-74.006, 40.7128],
  'nyc': [-74.006, 40.7128],
  'london': [-0.1276, 51.5074],
  'paris': [2.3522, 48.8566],
  'tokyo': [139.6917, 35.6895],
  'moscow': [37.6173, 55.7558],
  'beijing': [116.4074, 39.9042],
  'sydney': [151.2093, -33.8688],
  'los angeles': [-118.2437, 34.0522],
  'la': [-118.2437, 34.0522],
  'chicago': [-87.6298, 41.8781],
  'dubai': [55.2708, 25.2048],
  'singapore': [103.8198, 1.3521],
  'mumbai': [72.8777, 19.076],
  'cairo': [31.2357, 30.0444],
  'berlin': [13.405, 52.52],
  'rome': [12.4964, 41.9028],
  'seoul': [126.978, 37.5665],
  'toronto': [-79.3832, 43.6532],
  'cape town': [18.4241, -33.9249],
  'rio': [-43.1729, -22.9068],
  'pentagon': [-77.0558, 38.871],
  'area 51': [-115.8111, 37.2431],
  'langley': [-76.4813, 37.0846],
  'kremlin': [37.6176, 55.7518],
  'pyongyang': [125.7625, 39.0392],
  'tehran': [51.389, 35.6892],
  // Conflict zones
  'bandar abbas': [56.2808, 27.1865],
  'strait of hormuz': [56.3, 26.6],
  'natanz': [51.7272, 33.7211],
  'isfahan': [51.6779, 32.6546],
  'bushehr': [50.8386, 28.9684],
  'incirlik': [35.4258, 37.0017],
  'al udeid': [51.315, 25.117],
  'diego garcia': [72.4229, -7.3195],
  'sevastopol': [33.5254, 44.6166],
  'taiwan': [120.9605, 23.6978],
  'guam': [144.7937, 13.4443],
  'ramstein': [7.6003, 49.4369],
};

export function handleSearch(query: string, viewer: Cesium.Viewer) {
  const q = query.trim();
  if (!q) return;

  // Try lat,lon parsing
  const latLon = q.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (latLon) {
    const lat = parseFloat(latLon[1]);
    const lon = parseFloat(latLon[2]);
    flyToLocation(viewer, lon, lat, 500000);
    return;
  }

  // Known locations
  const key = q.toLowerCase();
  const match = Object.entries(LOCATIONS).find(([name]) => key.includes(name));
  if (match) {
    flyToLocation(viewer, match[1][0], match[1][1], 500000);
    return;
  }

  console.log('Search: no match for', q);
}

/** Get all location names for command palette autocomplete. */
export function getLocationNames(): string[] {
  return Object.keys(LOCATIONS);
}
