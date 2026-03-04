// ============================================================
// Visibility-Aware Interval — drop-in setInterval replacement
// ============================================================
//
// Pauses all registered intervals when tab is hidden.
// Resumes when tab becomes visible again.
// Single biggest perf win: no API calls, no CPU burn in background tabs.

const intervals: Map<number, { callback: () => void; ms: number; id: number }> = new Map();
let paused = false;
let nextId = 1;

/** Drop-in replacement for setInterval that pauses when tab is hidden. */
export function smartInterval(callback: () => void, ms: number): number {
  const id = nextId++;
  const timerId = window.setInterval(() => {
    if (!paused) callback();
  }, ms);
  intervals.set(id, { callback, ms, id: timerId });
  return id;
}

/** Clear a smart interval. */
export function clearSmartInterval(id: number) {
  const entry = intervals.get(id);
  if (entry) {
    clearInterval(entry.id);
    intervals.delete(id);
  }
}

// Pause/resume on visibility change
document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  console.log(`[Tick] ${paused ? 'Paused' : 'Resumed'} — ${intervals.size} intervals`);
});

/** Get count of active intervals. */
export function activeIntervalCount(): number {
  return intervals.size;
}
