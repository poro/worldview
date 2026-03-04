import { smartInterval, clearSmartInterval } from '../tick';
// ============================================
// TimeController — Central time state manager
// Manages LIVE vs REPLAY modes, playback speed,
// and emits time change events to all layers.
// ============================================

export type TimeMode = 'LIVE' | 'REPLAY';

export type PlaybackSpeed = 1 | 3 | 5 | 15 | 60 | 3600;

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 3, 5, 15, 60, 3600];

export interface TimeState {
  mode: TimeMode;
  currentTime: Date;
  speed: PlaybackSpeed;
  playing: boolean;
}

export type TimeChangeCallback = (state: TimeState) => void;

export class TimeController {
  private _mode: TimeMode = 'LIVE';
  private _currentTime: Date = new Date();
  private _speed: PlaybackSpeed = 1;
  private _playing: boolean = false;
  private _listeners: Set<TimeChangeCallback> = new Set();
  private _tickInterval: number | null = null;
  private _lastTickWall: number = 0;

  // Tick rate — 50ms for smooth scrubber updates
  private static readonly TICK_MS = 50;

  get mode(): TimeMode { return this._mode; }
  get currentTime(): Date { return this._currentTime; }
  get speed(): PlaybackSpeed { return this._speed; }
  get playing(): boolean { return this._playing; }
  get isLive(): boolean { return this._mode === 'LIVE'; }
  get isReplay(): boolean { return this._mode === 'REPLAY'; }

  get state(): TimeState {
    return {
      mode: this._mode,
      currentTime: new Date(this._currentTime.getTime()),
      speed: this._speed,
      playing: this._playing,
    };
  }

  /** Subscribe to time changes. Returns unsubscribe function. */
  subscribe(cb: TimeChangeCallback): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** Enter REPLAY mode at a specific time */
  seekTo(time: Date) {
    this._mode = 'REPLAY';
    this._currentTime = new Date(time.getTime());
    this.emit();
  }

  /** Step forward/backward by milliseconds */
  stepBy(deltaMs: number) {
    if (this._mode === 'LIVE') {
      // Entering replay from live — snapshot current time
      this._mode = 'REPLAY';
      this._currentTime = new Date();
    }
    this._currentTime = new Date(this._currentTime.getTime() + deltaMs);
    // Clamp to not exceed current real time
    const now = Date.now();
    if (this._currentTime.getTime() > now) {
      this._currentTime = new Date(now);
    }
    this.emit();
  }

  /** Start playback at current speed */
  play() {
    if (this._mode === 'LIVE') return; // Nothing to play in live mode
    this._playing = true;
    this._lastTickWall = performance.now();
    this.startTick();
    this.emit();
  }

  /** Pause playback */
  pause() {
    this._playing = false;
    this.stopTick();
    this.emit();
  }

  /** Toggle play/pause */
  togglePlayback() {
    if (this._playing) this.pause();
    else this.play();
  }

  /** Set playback speed multiplier */
  setSpeed(speed: PlaybackSpeed) {
    this._speed = speed;
    this.emit();
  }

  /** Cycle to next speed */
  cycleSpeed(): PlaybackSpeed {
    const idx = PLAYBACK_SPEEDS.indexOf(this._speed);
    const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    this.setSpeed(next);
    return next;
  }

  /** Snap back to real-time LIVE mode */
  goLive() {
    this.stopTick();
    this._mode = 'LIVE';
    this._currentTime = new Date();
    this._playing = false;
    this._speed = 1;
    this.emit();
  }

  /** Get the effective "now" for data queries — in LIVE mode returns real Date.now() */
  getEffectiveTime(): Date {
    if (this._mode === 'LIVE') return new Date();
    return new Date(this._currentTime.getTime());
  }

  dispose() {
    this.stopTick();
    this._listeners.clear();
  }

  // --- Internal ---

  private emit() {
    const state = this.state;
    for (const cb of this._listeners) {
      try { cb(state); } catch (e) { console.warn('[TimeController] Listener error:', e); }
    }
  }

  private startTick() {
    if (this._tickInterval) return;
    this._tickInterval = smartInterval(() => this.tick(), TimeController.TICK_MS);
  }

  private stopTick() {
    if (this._tickInterval) {
      clearSmartInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  private tick() {
    if (!this._playing || this._mode === 'LIVE') {
      this.stopTick();
      return;
    }

    const now = performance.now();
    const wallDelta = now - this._lastTickWall;
    this._lastTickWall = now;

    // Advance simulation time by wall-clock delta * speed
    const simDelta = wallDelta * this._speed;
    const newTime = this._currentTime.getTime() + simDelta;

    // Don't go past real-time
    const realNow = Date.now();
    if (newTime >= realNow) {
      this.goLive();
      return;
    }

    this._currentTime = new Date(newTime);
    this.emit();
  }
}
