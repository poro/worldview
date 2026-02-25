export function formatAltitude(meters: number | null): string {
  if (meters === null || meters === undefined) return '---';
  if (meters > 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatSpeed(ms: number | null): string {
  if (ms === null || ms === undefined) return '---';
  const knots = ms * 1.94384;
  return `${Math.round(knots)} kts`;
}

export function formatSpeedKmh(ms: number | null): string {
  if (ms === null || ms === undefined) return '---';
  return `${Math.round(ms * 3.6)} km/h`;
}

export function formatCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir} ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

export function formatHeading(degrees: number | null): string {
  if (degrees === null || degrees === undefined) return '---';
  return `${Math.round(degrees)}°`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function altitudeToColor(altMeters: number): string {
  if (altMeters < 1000) return '#00ff88';
  if (altMeters < 3000) return '#00e5ff';
  if (altMeters < 8000) return '#4dabf7';
  if (altMeters < 12000) return '#ffb300';
  return '#ff3d3d';
}
