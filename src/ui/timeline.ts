import { smartInterval, clearSmartInterval } from '../tick';
// ============================================
// Timeline UI Component
// Horizontal timeline bar with scrubber, playback
// controls, event markers, and date picker.
// ============================================

import './timeline.css';
import { TimeController, TimeState } from '../time/controller';
import { TimelineEvent, DataAdapter } from '../time/data-adapter';
import { formatUTC } from '../utils/time';

// Default timeline window: 24 hours
const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000;

// How often to refresh the scrubber position in ms
const SCRUBBER_REFRESH_MS = 100;

export interface TimelineCallbacks {
  onFlyToEvent?: (event: TimelineEvent) => void;
  onModeChange?: (mode: 'LIVE' | 'REPLAY') => void;
}

export class Timeline {
  private container: HTMLElement;
  private timeController: TimeController;
  private callbacks: TimelineCallbacks;
  private eventAdapter: DataAdapter | null = null;

  // DOM references
  private root: HTMLElement | null = null;
  private playBtn: HTMLElement | null = null;
  private speedBtn: HTMLElement | null = null;
  private liveBtn: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private modeBadge: HTMLElement | null = null;
  private dateInput: HTMLInputElement | null = null;
  private scrubber: HTMLElement | null = null;
  private trackFill: HTMLElement | null = null;
  private playhead: HTMLElement | null = null;
  private labelsRow: HTMLElement | null = null;
  private eventsLayer: HTMLElement | null = null;
  private eventPipsLayer: HTMLElement | null = null;
  private speedPresetsContainer: HTMLElement | null = null;
  private ticksLayer: HTMLElement | null = null;

  // Scrub overlay
  private scrubOverlay: HTMLElement | null = null;
  private scrubOverlayTimeout: ReturnType<typeof setTimeout> | null = null;

  // State
  private rangeMs: number = DEFAULT_RANGE_MS;
  private rangeStart: Date = new Date(Date.now() - DEFAULT_RANGE_MS);
  private rangeEnd: Date = new Date();
  private events: TimelineEvent[] = [];
  private isDragging: boolean = false;
  private refreshInterval: number | null = null;
  private eventFetchTimer: number | null = null;
  private unsubscribeTime: (() => void) | null = null;

  constructor(timeController: TimeController, callbacks: TimelineCallbacks = {}, eventAdapter?: DataAdapter) {
    this.timeController = timeController;
    this.callbacks = callbacks;
    this.eventAdapter = eventAdapter || null;
    this.container = document.getElementById('ui-overlay')!;
    this.build();
    this.bindEvents();
    this.startRefresh();

    // Fetch events from adapter if available
    if (this.eventAdapter) {
      this.fetchEvents();
      this.eventFetchTimer = smartInterval(() => this.fetchEvents(), 60000);
    }
  }

  // --- Public API ---

  setEvents(events: TimelineEvent[]) {
    this.events = events;
    this.renderEventMarkers();
  }

  setRange(startTime: Date, endTime: Date) {
    this.rangeStart = startTime;
    this.rangeEnd = endTime;
    this.rangeMs = endTime.getTime() - startTime.getTime();
    this.renderLabels();
    this.renderTicks();
    this.renderEventMarkers();
    this.updateScrubber();
  }

  dispose() {
    if (this.refreshInterval) clearSmartInterval(this.refreshInterval);
    if (this.eventFetchTimer) clearSmartInterval(this.eventFetchTimer);
    if (this.unsubscribeTime) this.unsubscribeTime();
    if (this.root) this.root.remove();
  }

  /** Fetch events from adapter for the current visible range */
  private async fetchEvents() {
    if (!this.eventAdapter?.getEvents) return;
    try {
      this.events = await this.eventAdapter.getEvents(this.rangeStart, this.rangeEnd);
      this.renderEventMarkers();
    } catch {
      // Events are non-critical — silently fail
    }
  }

  // --- Build DOM ---

  private build() {
    this.root = document.createElement('div');
    this.root.className = 'timeline-container hud-element';
    this.root.innerHTML = `
      <div class="timeline-panel">
        <div class="timeline-controls">
          <button class="timeline-btn timeline-btn-play" id="tl-play" title="Play/Pause (Space)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
          </button>
          <button class="timeline-btn timeline-btn-speed" id="tl-speed" title="Playback speed">1x</button>
          <div class="timeline-mode-badge live" id="tl-mode">LIVE</div>
          <div class="timeline-time-display" id="tl-time">--:--:--Z</div>
          <div class="timeline-spacer"></div>
          <input type="datetime-local" class="timeline-date-input" id="tl-date" title="Jump to date/time" />
          <button class="timeline-btn timeline-btn-live active" id="tl-live" title="Return to live">LIVE</button>
        </div>
        <div class="timeline-speed-presets" id="tl-speed-presets">
          <button class="tl-speed-preset active" data-speed="1">1x/s</button>
          <button class="tl-speed-preset" data-speed="3">3x/s</button>
          <button class="tl-speed-preset" data-speed="5">5x/s</button>
          <button class="tl-speed-preset" data-speed="15">15x/s</button>
          <button class="tl-speed-preset" data-speed="60">1m/s</button>
          <button class="tl-speed-preset" data-speed="3600">1h/s</button>
        </div>
        <div class="timeline-scrubber" id="tl-scrubber">
          <div class="timeline-ticks" id="tl-ticks"></div>
          <div class="timeline-track">
            <div class="timeline-track-fill" id="tl-track-fill"></div>
          </div>
          <div class="timeline-events" id="tl-events"></div>
          <div class="timeline-event-pips" id="tl-event-pips"></div>
          <div class="timeline-playhead" id="tl-playhead"></div>
          <div class="timeline-labels" id="tl-labels"></div>
        </div>
        <div class="timeline-keyhint">
          <kbd>Space</kbd> play/pause
          <kbd>\u2190</kbd><kbd>\u2192</kbd> \u00b11 min
          <kbd>Shift</kbd>+<kbd>\u2190</kbd><kbd>\u2192</kbd> \u00b11 hr
        </div>
      </div>
    `;

    this.container.appendChild(this.root);

    // Cache DOM refs
    this.playBtn = this.root.querySelector('#tl-play')!;
    this.speedBtn = this.root.querySelector('#tl-speed')!;
    this.liveBtn = this.root.querySelector('#tl-live')!;
    this.timeDisplay = this.root.querySelector('#tl-time')!;
    this.modeBadge = this.root.querySelector('#tl-mode')!;
    this.dateInput = this.root.querySelector('#tl-date') as HTMLInputElement;
    this.scrubber = this.root.querySelector('#tl-scrubber')!;
    this.trackFill = this.root.querySelector('#tl-track-fill')!;
    this.playhead = this.root.querySelector('#tl-playhead')!;
    this.labelsRow = this.root.querySelector('#tl-labels')!;
    this.eventsLayer = this.root.querySelector('#tl-events')!;
    this.eventPipsLayer = this.root.querySelector('#tl-event-pips')!;
    this.speedPresetsContainer = this.root.querySelector('#tl-speed-presets')!;
    this.ticksLayer = this.root.querySelector('#tl-ticks')!;

    // Scrub overlay (large center-screen time offset)
    this.scrubOverlay = document.createElement('div');
    this.scrubOverlay.className = 'scrub-overlay';
    this.scrubOverlay.innerHTML = `
      <div class="scrub-overlay-offset">-00:00</div>
      <div class="scrub-overlay-time">00:00:00Z</div>
    `;
    document.body.appendChild(this.scrubOverlay);

    // Initial render
    this.renderLabels();
    this.renderTicks();
    this.updateFromState(this.timeController.state);
  }

  // --- Bind Events ---

  private bindEvents() {
    // Play/pause
    this.playBtn!.addEventListener('click', () => {
      if (this.timeController.isLive) {
        // Start replay from 1 hour ago
        const oneHourAgo = new Date(Date.now() - 3600000);
        this.timeController.seekTo(oneHourAgo);
        this.timeController.play();
      } else {
        this.timeController.togglePlayback();
      }
    });

    // Speed cycle
    this.speedBtn!.addEventListener('click', () => {
      this.timeController.cycleSpeed();
    });

    // Live button
    this.liveBtn!.addEventListener('click', () => {
      this.timeController.goLive();
    });

    // Speed preset buttons
    this.speedPresetsContainer!.querySelectorAll('.tl-speed-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseInt((btn as HTMLElement).dataset.speed || '1', 10);
        this.timeController.setSpeed(speed as import('../time/controller').PlaybackSpeed);
      });
    });

    // Date picker
    this.dateInput!.addEventListener('change', () => {
      const val = this.dateInput!.value;
      if (val) {
        const date = new Date(val + 'Z'); // Treat as UTC
        if (!isNaN(date.getTime())) {
          this.timeController.seekTo(date);
          this.centerRangeOn(date);
        }
      }
    });

    // Scrubber mouse + touch events
    this.scrubber!.addEventListener('mousedown', (e) => this.onScrubberMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onScrubberMouseMove(e));
    document.addEventListener('mouseup', () => this.onScrubberMouseUp());

    // Touch support (Mac trackpad + mobile)
    this.scrubber!.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onScrubberMouseDown({ clientX: touch.clientX, target: e.target } as MouseEvent);
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const touch = e.touches[0];
      this.onScrubberMouseMove({ clientX: touch.clientX } as MouseEvent);
    });
    document.addEventListener('touchend', () => this.onScrubberMouseUp());

    // Subscribe to time controller changes
    this.unsubscribeTime = this.timeController.subscribe((state) => {
      this.updateFromState(state);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  // --- Scrubber Drag ---

  private onScrubberMouseDown(e: MouseEvent) {
    // Ignore if clicking an event marker
    if ((e.target as HTMLElement).closest('.timeline-event-marker')) return;

    this.isDragging = true;
    this.playhead!.classList.add('dragging');
    this.scrubToPosition(e);
  }

  private onScrubberMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    this.scrubToPosition(e);
  }

  private onScrubberMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.playhead!.classList.remove('dragging');
  }

  private scrubToPosition(e: MouseEvent) {
    const rect = this.scrubber!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = new Date(this.rangeStart.getTime() + x * this.rangeMs);
    this.timeController.seekTo(time);
    this.showScrubOverlay();
  }

  // --- Keyboard Shortcuts ---

  private onKeyDown(e: KeyboardEvent) {
    if (document.activeElement?.tagName === 'INPUT') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (this.timeController.isLive) {
          const oneHourAgo = new Date(Date.now() - 3600000);
          this.timeController.seekTo(oneHourAgo);
          this.timeController.play();
        } else {
          this.timeController.togglePlayback();
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) {
          this.timeController.stepBy(-3600000);
        } else {
          this.timeController.stepBy(-60000);
        }
        this.showScrubOverlay();
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) {
          this.timeController.stepBy(3600000);
        } else {
          this.timeController.stepBy(60000);
        }
        this.showScrubOverlay();
        break;
    }
  }

  // --- State Updates ---

  private updateFromState(state: TimeState) {
    // Mode badge
    if (state.mode === 'LIVE') {
      this.modeBadge!.textContent = 'LIVE';
      this.modeBadge!.className = 'timeline-mode-badge live';
      this.liveBtn!.classList.add('active');
      this.timeDisplay!.className = 'timeline-time-display';
      this.hideScrubOverlay();
    } else {
      this.modeBadge!.textContent = 'REPLAY';
      this.modeBadge!.className = 'timeline-mode-badge replay';
      this.liveBtn!.classList.remove('active');
      this.timeDisplay!.className = 'timeline-time-display replay';
    }

    // Time display
    this.timeDisplay!.textContent = formatUTC(state.currentTime);

    // Play button icon
    if (state.playing) {
      this.playBtn!.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>';
    } else {
      this.playBtn!.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
    }

    // Speed button
    this.speedBtn!.textContent = `${state.speed}x`;

    // Update speed preset active state
    this.speedPresetsContainer?.querySelectorAll('.tl-speed-preset').forEach((btn) => {
      const speed = parseInt((btn as HTMLElement).dataset.speed || '0', 10);
      btn.classList.toggle('active', speed === state.speed);
    });

    // Update scrubber position
    this.updateScrubber();

    // Notify mode change
    this.callbacks.onModeChange?.(state.mode);
  }

  private updateScrubber() {
    const effectiveTime = this.timeController.getEffectiveTime();
    const t = effectiveTime.getTime();

    // In LIVE mode, keep range end at now
    if (this.timeController.isLive) {
      this.rangeEnd = new Date();
      this.rangeStart = new Date(this.rangeEnd.getTime() - this.rangeMs);
    }

    // Calculate position 0-1
    const fraction = Math.max(0, Math.min(1, (t - this.rangeStart.getTime()) / this.rangeMs));

    // Auto-scroll range if playhead goes past 90%
    if (fraction > 0.9 && this.timeController.isReplay && this.timeController.playing) {
      this.centerRangeOn(effectiveTime);
    }

    // Update DOM
    const pct = (fraction * 100).toFixed(2);
    this.trackFill!.style.width = `${pct}%`;
    this.playhead!.style.left = `${pct}%`;
  }

  private centerRangeOn(time: Date) {
    const halfRange = this.rangeMs / 2;
    this.rangeStart = new Date(time.getTime() - halfRange);
    this.rangeEnd = new Date(time.getTime() + halfRange);
    this.renderLabels();
    this.renderTicks();
    this.renderEventMarkers();
  }

  // --- Render Labels ---

  private renderLabels() {
    if (!this.labelsRow) return;

    const labelCount = 7;
    const labels: string[] = [];

    for (let i = 0; i < labelCount; i++) {
      const t = this.rangeStart.getTime() + (this.rangeMs * i) / (labelCount - 1);
      const d = new Date(t);
      labels.push(this.formatShortUTC(d));
    }

    this.labelsRow.innerHTML = labels
      .map(l => `<span class="timeline-label">${l}</span>`)
      .join('');
  }

  // --- Render Tick Marks ---

  private renderTicks() {
    if (!this.ticksLayer) return;

    const rangeHours = this.rangeMs / 3600000;
    let majorIntervalMs: number;
    let minorIntervalMs: number;

    if (rangeHours <= 6) {
      majorIntervalMs = 3600000; // 1 hour
      minorIntervalMs = 600000;  // 10 min
    } else if (rangeHours <= 24) {
      majorIntervalMs = 3600000 * 4; // 4 hours
      minorIntervalMs = 3600000;     // 1 hour
    } else {
      majorIntervalMs = 3600000 * 12; // 12 hours
      minorIntervalMs = 3600000 * 3;  // 3 hours
    }

    const startMs = this.rangeStart.getTime();
    const endMs = this.rangeEnd.getTime();
    let html = '';

    // Major ticks
    const majorStart = Math.ceil(startMs / majorIntervalMs) * majorIntervalMs;
    for (let t = majorStart; t <= endMs; t += majorIntervalMs) {
      const pct = ((t - startMs) / this.rangeMs) * 100;
      html += `<div class="timeline-tick major" style="left:${pct.toFixed(2)}%"></div>`;
    }

    // Minor ticks
    const minorStart = Math.ceil(startMs / minorIntervalMs) * minorIntervalMs;
    for (let t = minorStart; t <= endMs; t += minorIntervalMs) {
      if (t % majorIntervalMs === 0) continue;
      const pct = ((t - startMs) / this.rangeMs) * 100;
      html += `<div class="timeline-tick minor" style="left:${pct.toFixed(2)}%"></div>`;
    }

    this.ticksLayer.innerHTML = html;
  }

  // --- Event Markers ---

  private renderEventMarkers() {
    if (!this.eventsLayer) return;

    const startMs = this.rangeStart.getTime();
    let html = '';

    for (const evt of this.events) {
      const t = evt.time.getTime();
      if (t < startMs || t > this.rangeEnd.getTime()) continue;

      const pct = ((t - startMs) / this.rangeMs) * 100;
      const timeStr = this.formatShortUTC(evt.time);

      html += `
        <div class="timeline-event-marker ${evt.type}"
             style="left:${pct.toFixed(2)}%"
             data-event-time="${evt.time.toISOString()}"
             data-event-lat="${evt.lat}"
             data-event-lon="${evt.lon}">
          <div class="timeline-event-tooltip">
            <div class="timeline-event-tooltip-title">${this.escapeHtml(evt.title)}</div>
            <div class="timeline-event-tooltip-time">${timeStr}</div>
          </div>
        </div>
      `;
    }

    this.eventsLayer.innerHTML = html;

    // Render event pips on the track bar (small red lines)
    if (this.eventPipsLayer) {
      let pipHtml = '';
      for (const evt of this.events) {
        const t = evt.time.getTime();
        if (t < startMs || t > this.rangeEnd.getTime()) continue;
        const pct = ((t - startMs) / this.rangeMs) * 100;
        pipHtml += `<div class="timeline-event-pip" style="left:${pct.toFixed(2)}%"></div>`;
      }
      this.eventPipsLayer.innerHTML = pipHtml;
    }

    // Bind click events
    this.eventsLayer.querySelectorAll('.timeline-event-marker').forEach((marker) => {
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = marker as HTMLElement;
        const time = new Date(el.dataset.eventTime!);

        // Seek to event time
        this.timeController.seekTo(time);

        // Fly to event location
        const evt = this.events.find(
          ev => ev.time.toISOString() === el.dataset.eventTime
        );
        if (evt && this.callbacks.onFlyToEvent) {
          this.callbacks.onFlyToEvent(evt);
        }
      });
    });
  }

  // --- Refresh Loop ---

  private startRefresh() {
    this.refreshInterval = smartInterval(() => {
      if (!this.isDragging) {
        this.updateScrubber();
        // In live mode, keep labels current
        if (this.timeController.isLive) {
          this.rangeEnd = new Date();
          this.rangeStart = new Date(this.rangeEnd.getTime() - this.rangeMs);
        }
      }
    }, SCRUBBER_REFRESH_MS);
  }

  // --- Scrub Overlay ---

  private showScrubOverlay() {
    if (!this.scrubOverlay) return;
    const now = Date.now();
    const effective = this.timeController.getEffectiveTime().getTime();
    const diffMs = effective - now;
    const absDiff = Math.abs(diffMs);
    const sign = diffMs <= 0 ? '-' : '+';

    let offsetStr: string;
    if (absDiff < 60000) {
      offsetStr = `${sign}${Math.round(absDiff / 1000)}s`;
    } else if (absDiff < 3600000) {
      const mins = Math.floor(absDiff / 60000);
      const secs = Math.floor((absDiff % 60000) / 1000);
      offsetStr = `${sign}${mins}m ${String(secs).padStart(2, '0')}s`;
    } else {
      const hrs = Math.floor(absDiff / 3600000);
      const mins = Math.floor((absDiff % 3600000) / 60000);
      offsetStr = `${sign}${hrs}h ${String(mins).padStart(2, '0')}m`;
    }

    const t = this.timeController.getEffectiveTime();
    const timeStr = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:${String(t.getUTCSeconds()).padStart(2, '0')}Z`;

    this.scrubOverlay.querySelector('.scrub-overlay-offset')!.textContent = offsetStr;
    this.scrubOverlay.querySelector('.scrub-overlay-time')!.textContent = timeStr;
    this.scrubOverlay.classList.add('visible');

    // Auto-hide after 2s of inactivity
    if (this.scrubOverlayTimeout) clearTimeout(this.scrubOverlayTimeout);
    this.scrubOverlayTimeout = setTimeout(() => {
      this.scrubOverlay?.classList.remove('visible');
    }, 2000);
  }

  private hideScrubOverlay() {
    if (this.scrubOverlayTimeout) clearTimeout(this.scrubOverlayTimeout);
    this.scrubOverlay?.classList.remove('visible');
  }

  // --- Helpers ---

  private formatShortUTC(date: Date): string {
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');

    // Show date if range spans multiple days
    if (this.rangeMs > 24 * 3600000) {
      const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${mo}/${d} ${h}:${m}`;
    }

    return `${h}:${m}Z`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
