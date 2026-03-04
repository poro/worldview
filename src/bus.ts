// ============================================================
// Event Bus — decouples system communication
// ============================================================
//
// Systems publish events. Other systems subscribe.
// Replaces direct callback wiring in main.ts.

type Handler = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    // Return unsubscribe function
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (e) {
        console.warn(`[Bus] Handler for '${event}' failed:`, e);
      }
    }
  }

  /** Remove all listeners for an event. */
  off(event: string) {
    this.listeners.delete(event);
  }

  /** Get listener count for debugging. */
  listenerCount(event?: string): number {
    if (event) return this.listeners.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
}

// Singleton
export const bus = new EventBus();

// ============================================================
// Event Types (for documentation / autocomplete)
// ============================================================
//
// Layer events:
//   'layer:toggle'     (layerId: string, active: boolean)
//   'layer:started'    (layerId: string)
//
// Navigation:
//   'nav:flyto'        (lon: number, lat: number, alt: number, duration?: number)
//   'nav:preset'       (presetKey: string)
//
// Entity selection:
//   'entity:select'    (type: string, id: string | null)
//   'entity:deselect'  ()
//
// UI:
//   'ui:toast'         (message: string, level?: string)
//   'ui:filter'        (mode: string)
//   'ui:help'          ()
//   'ui:palette'       ()
//
// Feed:
//   'feed:toggle'      ()
//   'feed:mode'        (mode: 'live' | 'scenario')
//   'feed:loaded'      (count: number, sources: string[])
