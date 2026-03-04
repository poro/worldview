// ============================================================
// Keyboard handler — extracted from main.ts
// ============================================================
//
// Emits events on the bus instead of directly calling systems.
// main.ts subscribes to these events and dispatches to systems.

import { bus } from './bus';
import { openPalette, isPaletteOpen, closePalette } from './ui/command-palette';
import { toggleHelp, isHelpVisible } from './ui/help-overlay';
import { toggleLegend } from './ui/legend';

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't capture if input is focused
    if (document.activeElement?.tagName === 'INPUT') return;

    // Command palette
    if (e.key === '/') {
      e.preventDefault();
      openPalette();
      return;
    }
    if (isPaletteOpen()) return;

    // Help overlay
    if (e.key === '?') {
      toggleHelp();
      return;
    }
    if (isHelpVisible()) {
      toggleHelp();
      return;
    }

    switch (e.key) {
      // Visual filters (1-5)
      case '1': bus.emit('filter:set', 0, 'normal'); break;
      case '2': bus.emit('filter:set', 1, 'nightvision'); break;
      case '3': bus.emit('filter:set', 2, 'flir'); break;
      case '4': bus.emit('filter:set', 3, 'crt'); break;
      case '5': bus.emit('filter:set', 4, 'enhanced'); break;

      // Layer toggles
      case 'c': case 'C': bus.emit('layer:toggle', 'cctv'); break;
      case 'f': case 'F': bus.emit('layer:toggle', 'flights'); break;
      case 's': case 'S': bus.emit('layer:toggle', 'satellites'); break;
      case 'g': case 'G': bus.emit('layer:toggle', 'earthquakes'); break;
      case 't': case 'T': bus.emit('layer:toggle', 'traffic'); break;
      case 'm': case 'M': bus.emit('layer:toggle', 'military'); break;
      case 'n': case 'N': bus.emit('layer:toggle', 'feed'); break;
      case 'h': case 'H': bus.emit('ui:toggle', 'hud'); break;
      case 'a': case 'A': bus.emit('ui:toggle', 'ticker'); break;
      case ';': toggleLegend(); break;
      case 'v': case 'V': bus.emit('ui:toggle', 'viewscout'); break;
      case 'j': case 'J': bus.emit('layer:toggle', 'fog'); break;
      case 'k': case 'K': bus.emit('layer:toggle', 'network'); break;
      case 'd': case 'D': bus.emit('layer:toggle', 'gps'); break;
      case 'z': case 'Z': bus.emit('layer:toggle', 'airspace'); break;
      case 'x': case 'X': bus.emit('layer:toggle', 'strikes'); break;
      case 'l': case 'L': bus.emit('layer:toggle', 'shipping'); break;
      case 'b': case 'B': bus.emit('layer:toggle', 'maritime'); break;

      // Location presets
      case 'q': case 'Q':
      case 'w': case 'W':
      case 'e': case 'E':
      case 'r': case 'R':
      case 'o': case 'O':
      case 'y': case 'Y':
      case 'u': case 'U':
      case 'i': case 'I':
        bus.emit('nav:preset', e.key.toUpperCase());
        break;

      // Quick zoom: Iran theater
      case 'p': case 'P':
        bus.emit('nav:flyto', 53, 32, 3000000, 2);
        bus.emit('ui:toast', 'NAVIGATING → IRAN THEATER');
        break;

      case 'Escape':
        if (isPaletteOpen()) { closePalette(); break; }
        if (isHelpVisible()) { toggleHelp(); break; }
        bus.emit('entity:deselect');
        break;
    }
  });
}
