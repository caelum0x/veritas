// Watermark tracking for out-of-order event time progress in streams.
import type { StreamEvent } from "./types.js";

export type Watermark = {
  readonly eventTime: number;
  readonly processingTime: number;
};

export type WatermarkStrategy = {
  /** Called per event; returns updated watermark. */
  onEvent: (event: StreamEvent, current: Watermark) => Watermark;
  /** Called on idle tick to advance watermark by wall clock. */
  onIdle: (current: Watermark, wallClock: number) => Watermark;
};

/** Creates a zero watermark. */
export function zeroWatermark(): Watermark {
  return { eventTime: 0, processingTime: 0 };
}

/**
 * Bounded-out-of-order watermark: watermark = max(event.timestamp) - maxLatenessMs.
 */
export function boundedOutOfOrder(maxLatenessMs: number): WatermarkStrategy {
  let maxSeen = 0;
  return {
    onEvent(event, _current) {
      maxSeen = Math.max(maxSeen, event.timestamp);
      return {
        eventTime: Math.max(0, maxSeen - maxLatenessMs),
        processingTime: Date.now(),
      };
    },
    onIdle(current, wallClock) {
      return { ...current, processingTime: wallClock };
    },
  };
}

/** Monotonic watermark: strictly increasing event time, no lateness allowance. */
export function monotonicWatermark(): WatermarkStrategy {
  let maxSeen = 0;
  return {
    onEvent(event, _current) {
      maxSeen = Math.max(maxSeen, event.timestamp);
      return { eventTime: maxSeen, processingTime: Date.now() };
    },
    onIdle(current, wallClock) {
      return { ...current, processingTime: wallClock };
    },
  };
}

/** Tracks watermark state for a stream. */
export class WatermarkTracker {
  private current: Watermark;
  private readonly strategy: WatermarkStrategy;

  constructor(strategy: WatermarkStrategy) {
    this.strategy = strategy;
    this.current = zeroWatermark();
  }

  advance(event: StreamEvent): Watermark {
    this.current = this.strategy.onEvent(event, this.current);
    return this.current;
  }

  idle(wallClock: number = Date.now()): Watermark {
    this.current = this.strategy.onIdle(this.current, wallClock);
    return this.current;
  }

  get(): Watermark {
    return this.current;
  }
}
