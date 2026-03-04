// Help Overlay — press ? to show keyboard shortcuts

const SHORTCUTS = [
  { section: 'DATA LAYERS', items: [
    { key: 'F', desc: 'Flights (ADS-B)' },
    { key: 'S', desc: 'Satellites' },
    { key: 'B', desc: 'Maritime (AIS)' },
    { key: 'G', desc: 'Earthquakes (USGS)' },
    { key: 'T', desc: 'Traffic Particles' },
    { key: 'C', desc: 'CCTV Feeds' },
    { key: 'M', desc: 'Military Filter' },
  ]},
  { section: 'OSINT LAYERS', items: [
    { key: 'N', desc: 'Live News Feed' },
    { key: 'D', desc: 'GPS Interference' },
    { key: 'Z', desc: 'No-Fly Zones' },
    { key: 'X', desc: 'Strikes' },
    { key: 'L', desc: 'Shipping Lanes' },
    { key: 'J', desc: 'Info Fog Overlay' },
    { key: 'K', desc: 'Network Graph' },
  ]},
  { section: 'VISUAL FILTERS', items: [
    { key: '1', desc: 'Normal' },
    { key: '2', desc: 'Night Vision' },
    { key: '3', desc: 'FLIR / Thermal' },
    { key: '4', desc: 'CRT / Retro' },
    { key: '5', desc: 'Enhanced' },
  ]},
  { section: 'NAVIGATION', items: [
    { key: 'Q W E R', desc: 'Location Presets' },
    { key: 'O Y U I', desc: 'More Presets' },
    { key: 'P', desc: 'Iran Theater' },
  ]},
  { section: 'UI', items: [
    { key: 'H', desc: 'HUD Toggle' },
    { key: 'V', desc: 'ViewScout Panel' },
    { key: 'A', desc: 'News Ticker' },
    { key: '/', desc: 'Command Palette' },
    { key: '?', desc: 'This Help' },
    { key: 'Esc', desc: 'Close / Deselect' },
  ]},
];

let overlay: HTMLElement | null = null;

function createOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'help-overlay';
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; color: #fff;
    opacity: 0; transition: opacity 0.2s;
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;
    padding: 32px;
  `;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <h1 style="font-size:18px;font-weight:700;letter-spacing:2px;margin:0;">WORLDVIEW — KEYBOARD SHORTCUTS</h1>
      <span style="color:rgba(255,255,255,0.4);font-size:12px;">Press ? or Esc to close</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:24px;">
      ${SHORTCUTS.map(section => `
        <div>
          <h2 style="font-size:10px;letter-spacing:2px;color:rgba(255,255,255,0.4);margin:0 0 8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">${section.section}</h2>
          ${section.items.map(item => `
            <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
              <kbd style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:3px;padding:2px 6px;font-size:11px;min-width:24px;text-align:center;">${item.key}</kbd>
              <span style="font-size:12px;color:rgba(255,255,255,0.7);">${item.desc}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div style="margin-top:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:10px;">
      WorldView v1.0 — Endless Games & Learning Lab
    </div>
  `;

  el.appendChild(container);
  el.addEventListener('click', () => hideHelp());
  return el;
}

export function toggleHelp() {
  if (overlay && overlay.style.opacity === '1') {
    hideHelp();
  } else {
    showHelp();
  }
}

function showHelp() {
  if (!overlay) {
    overlay = createOverlay();
    document.body.appendChild(overlay);
  }
  // Force reflow for transition
  overlay.offsetHeight;
  overlay.style.opacity = '1';
}

function hideHelp() {
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
    }, 200);
  }
}

export function isHelpVisible(): boolean {
  return overlay !== null && overlay.style.opacity === '1';
}
