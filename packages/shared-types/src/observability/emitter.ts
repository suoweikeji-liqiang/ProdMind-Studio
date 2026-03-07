import type { ObservabilityEvent, ObservabilityEmitter } from './events.js';

// Phase 5B: Minimal event emitter for observability
// In-memory, single-process only

export class SimpleObservabilityEmitter implements ObservabilityEmitter {
  private handlers: Array<(event: ObservabilityEvent) => void> = [];

  emit(event: ObservabilityEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (_error) {
        // Don't let handler errors break emission
        // Silently ignore in library code
      }
    });
  }

  subscribe(handler: (event: ObservabilityEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }
}

// Global singleton for simple usage
let globalEmitter: ObservabilityEmitter | null = null;

export function getGlobalEmitter(): ObservabilityEmitter {
  if (!globalEmitter) {
    globalEmitter = new SimpleObservabilityEmitter();
  }
  return globalEmitter;
}

export function setGlobalEmitter(emitter: ObservabilityEmitter): void {
  globalEmitter = emitter;
}
