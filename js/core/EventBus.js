// Minimal pub/sub event bus used to decouple systems from UI/rendering.
export default class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) this.listeners.get(event).delete(handler);
  }

  emit(event, payload) {
    if (!this.listeners.has(event)) return;
    for (const handler of [...this.listeners.get(event)]) {
      handler(payload);
    }
  }
}
