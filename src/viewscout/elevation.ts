/**
 * Elevation profile chart — renders to a canvas element using Canvas 2D API.
 */

export interface ProfilePoint {
  distance: number;
  elevation: number;
}

export function renderElevationChart(
  canvas: HTMLCanvasElement,
  profile: ProfilePoint[],
  observerHeight: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || profile.length === 0) return;

  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 20, right: 16, bottom: 28, left: 44 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Clear
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  const maxDist = profile[profile.length - 1].distance;
  const elevations = profile.map((p) => p.elevation);
  const minElev = Math.min(...elevations, 0);
  const maxElev = Math.max(...elevations, observerHeight + profile[0].elevation) * 1.1 + 10;

  const xScale = (d: number) => pad.left + (d / maxDist) * plotW;
  const yScale = (e: number) => pad.top + plotH - ((e - minElev) / (maxElev - minElev)) * plotH;

  // Grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // Terrain fill
  ctx.beginPath();
  ctx.moveTo(xScale(profile[0].distance), yScale(profile[0].elevation));
  for (const p of profile) {
    ctx.lineTo(xScale(p.distance), yScale(p.elevation));
  }
  ctx.lineTo(xScale(profile[profile.length - 1].distance), yScale(minElev));
  ctx.lineTo(xScale(profile[0].distance), yScale(minElev));
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
  grad.addColorStop(1, 'rgba(0, 255, 136, 0.02)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Terrain line
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xScale(profile[0].distance), yScale(profile[0].elevation));
  for (const p of profile) {
    ctx.lineTo(xScale(p.distance), yScale(p.elevation));
  }
  ctx.stroke();

  // Line of sight from observer to target
  const obsElev = profile[0].elevation + observerHeight;
  const tgtElev = profile[profile.length - 1].elevation;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(obsElev));
  ctx.lineTo(xScale(maxDist), yScale(tgtElev));
  ctx.stroke();
  ctx.setLineDash([]);

  // Observer dot
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(xScale(0), yScale(obsElev), 4, 0, Math.PI * 2);
  ctx.fill();

  // Target dot
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(xScale(maxDist), yScale(tgtElev), 4, 0, Math.PI * 2);
  ctx.fill();

  // Labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  // X axis labels
  for (let i = 0; i <= 4; i++) {
    const d = (maxDist / 4) * i;
    const label = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`;
    ctx.fillText(label, xScale(d), H - 4);
  }

  // Y axis labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const e = minElev + ((maxElev - minElev) / 4) * (4 - i);
    ctx.fillText(`${Math.round(e)}m`, pad.left - 4, pad.top + (plotH / 4) * i + 3);
  }

  // Title
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ELEVATION PROFILE', pad.left, 12);
}
