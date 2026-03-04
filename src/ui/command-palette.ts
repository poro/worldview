// Command Palette — press / to open, type to filter, Enter to execute

export interface PaletteCommand {
  id: string;
  label: string;
  section: string;
  shortcut?: string;
  action: () => void;
}

let paletteEl: HTMLElement | null = null;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLElement | null = null;
let commands: PaletteCommand[] = [];
let filteredCommands: PaletteCommand[] = [];
let selectedIdx = 0;
let _isOpen = false;

export function registerCommands(cmds: PaletteCommand[]) {
  commands = cmds;
  filteredCommands = [...cmds];
}

export function openPalette() {
  if (_isOpen) return;
  _isOpen = true;

  if (!paletteEl) {
    paletteEl = createPalette();
    document.body.appendChild(paletteEl);
  }

  paletteEl.style.display = '';
  paletteEl.offsetHeight; // reflow
  paletteEl.style.opacity = '1';
  filteredCommands = [...commands];
  selectedIdx = 0;

  if (inputEl) {
    inputEl.value = '';
    inputEl.focus();
  }
  renderList();
}

export function closePalette() {
  if (!_isOpen) return;
  _isOpen = false;
  if (paletteEl) {
    paletteEl.style.opacity = '0';
    setTimeout(() => { if (paletteEl) paletteEl.style.display = 'none'; }, 150);
  }
}

export function isPaletteOpen(): boolean {
  return _isOpen;
}

function createPalette(): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
    display:flex;align-items:flex-start;justify-content:center;
    padding-top:15vh;opacity:0;transition:opacity 0.15s;
  `;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePalette();
  });

  const modal = document.createElement('div');
  modal.style.cssText = `
    width:480px;max-width:90vw;background:rgba(20,20,25,0.98);
    border:1px solid rgba(255,255,255,0.1);border-radius:8px;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden;
    font-family:'JetBrains Mono',monospace;
  `;

  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.placeholder = 'Type a command...';
  inputEl.style.cssText = `
    width:100%;box-sizing:border-box;padding:14px 16px;
    background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.1);
    color:#fff;font-size:14px;font-family:inherit;outline:none;
  `;
  inputEl.addEventListener('input', () => {
    filterCommands(inputEl!.value);
  });
  inputEl.addEventListener('keydown', handleKeydown);

  listEl = document.createElement('div');
  listEl.style.cssText = `max-height:50vh;overflow-y:auto;padding:4px 0;`;

  modal.appendChild(inputEl);
  modal.appendChild(listEl);
  backdrop.appendChild(modal);
  return backdrop;
}

function filterCommands(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredCommands = [...commands];
  } else {
    filteredCommands = commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }
  selectedIdx = 0;
  renderList();
}

function renderList() {
  if (!listEl) return;
  let lastSection = '';

  listEl.innerHTML = filteredCommands.map((cmd, i) => {
    let sectionHeader = '';
    if (cmd.section !== lastSection) {
      lastSection = cmd.section;
      sectionHeader = `<div style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.3);padding:8px 16px 2px;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.05);margin-top:4px;' : ''}">${cmd.section}</div>`;
    }
    const isSelected = i === selectedIdx;
    return `${sectionHeader}<div class="cmd-item" data-idx="${i}" style="
      padding:8px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;
      background:${isSelected ? 'rgba(255,255,255,0.08)' : 'transparent'};
      ${isSelected ? 'border-left:2px solid #00e5ff;padding-left:14px;' : ''}
    ">
      <span style="font-size:12px;color:${isSelected ? '#fff' : 'rgba(255,255,255,0.7)'};">${cmd.label}</span>
      ${cmd.shortcut ? `<kbd style="font-size:10px;color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:2px;">${cmd.shortcut}</kbd>` : ''}
    </div>`;
  }).join('');

  // Click handlers
  listEl.querySelectorAll('.cmd-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt((el as HTMLElement).dataset.idx || '0');
      executeCommand(idx);
    });
    el.addEventListener('mouseenter', () => {
      selectedIdx = parseInt((el as HTMLElement).dataset.idx || '0');
      renderList();
    });
  });
}

function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, filteredCommands.length - 1);
      renderList();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      renderList();
      break;
    case 'Enter':
      e.preventDefault();
      executeCommand(selectedIdx);
      break;
    case 'Escape':
      e.preventDefault();
      closePalette();
      break;
  }
}

function executeCommand(idx: number) {
  const cmd = filteredCommands[idx];
  if (cmd) {
    closePalette();
    // Small delay to let palette close before action
    requestAnimationFrame(() => cmd.action());
  }
}
