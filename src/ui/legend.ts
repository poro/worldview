// ============================================================
// Legend Overlay — color coding reference
// ============================================================

const LEGEND_ITEMS = [
  { color: '#ff3d3d', label: 'Kinetic', desc: 'Strikes, attacks' },
  { color: '#ffb300', label: 'Retaliation', desc: 'Counterstrikes' },
  { color: '#ff8c00', label: 'Civilian Impact', desc: 'Collateral' },
  { color: '#ff6600', label: 'Infrastructure', desc: 'Power, oil, comms' },
  { color: '#ff00ff', label: 'Escalation', desc: 'DEFCON, nuclear' },
  { color: '#00e5ff', label: 'Maritime', desc: 'Naval, shipping' },
  { color: '#00ff88', label: 'Intelligence', desc: 'SIGINT, recon' },
  { color: '#aa00ff', label: 'Cyber', desc: 'Hacks, blackouts' },
];

let legendEl: HTMLElement | null = null;
let _visible = false;

function create(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'legend-panel';
  el.innerHTML = `
    <div class="legend-title">EVENT LEGEND</div>
    ${LEGEND_ITEMS.map(i => `
      <div class="legend-row">
        <span class="legend-dot" style="background:${i.color}"></span>
        <span class="legend-label">${i.label}</span>
        <span class="legend-desc">${i.desc}</span>
      </div>
    `).join('')}
    <div class="legend-row" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1)">
      <span class="legend-dot" style="background:transparent;border:1.5px solid #4dabf7"></span>
      <span class="legend-label" style="color:#4dabf7">Earthquake</span>
      <span class="legend-desc">USGS seismic</span>
    </div>
    <div class="legend-hint">Press ; or /legend to toggle</div>
  `;
  document.getElementById('ui-overlay')!.appendChild(el);
  return el;
}

export function toggleLegend() {
  if (!legendEl) legendEl = create();
  _visible = !_visible;
  legendEl.style.display = _visible ? '' : 'none';
}

export function isLegendVisible(): boolean { return _visible; }
