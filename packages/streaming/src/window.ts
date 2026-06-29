// Tumbling and sliding window implementations for time-based event grouping.
import type { StreamEvent, WindowDef, WindowResult } from "./types.js";
import { WindowError } from "./errors.js";

function alignToTumbling(timestamp: number, sizeMs: number): number {
  return Math.floor(timestamp / sizeMs) * sizeMs;
}

export class TumblingWindow<T = unknown> {
  private readonly buckets = new Map<number, Array<StreamEvent<T>>>();

  constructor(private readonly sizeMs: number) {
    if (sizeMs <= 0) throw new WindowError("Tumbling window size must be > 0");
  }

  add(event: StreamEvent<T>): void {
    const start = alignToTumbling(event.timestamp, this.sizeMs);
    const bucket = this.buckets.get(start) ?? [];
    this.buckets.set(start, [...bucket, event]);
  }

  flush(beforeTs: number): ReadonlyArray<WindowResult<T>> {
    const results: Array<WindowResult<T>> = [];
    for (const [start, events] of this.buckets) {
      const end = start + this.sizeMs;
      if (end <= beforeTs) {
        results.push({ windowStart: start, windowEnd: end, events });
        this.buckets.delete(start);
      }
    }
    return results.sort((a, b) => a.windowStart - b.windowStart);
  }

  flushAll(): ReadonlyArray<WindowResult<T>> {
    return this.flush(Infinity);
  }
}

export class SlidingWindow<T = unknown> {
  private events: Array<StreamEvent<T>> = [];

  constructor(
    private readonly sizeMs: number,
    private readonly slideMs: number,
  ) {
    if (sizeMs <= 0) throw new WindowError("Sliding window size must be > 0");
    if (slideMs <= 0 || slideMs > sizeMs) {
      throw new WindowError("Slide interval must be > 0 and <= window size");
    }
  }

  add(event: StreamEvent<T>): void {
    this.events = [...this.events, event];
  }

  /** Returns all windows whose end time is <= now and start >= earliest retained event. */
  snapshot(now: number): ReadonlyArray<WindowResult<T>> {
    const results: Array<WindowResult<T>> = [];
    // Determine earliest window start that could contain the oldest event
    const oldestTs = this.events[0]?.timestamp ?? now;
    const firstStart = alignToTumbling(oldestTs, this.slideMs);
    for (let start = firstStart; start + this.sizeMs <= now; start += this.slideMs) {
      const end = start + this.sizeMs;
      const windowEvents = this.events.filter(
        (e) => e.timestamp >= start && e.timestamp < end,
      );
      results.push({ windowStart: start, windowEnd: end, events: windowEvents });
    }
    // Evict events older than the oldest possible window
    const cutoff = now - this.sizeMs;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    return results;
  }
}

export function createWindow<T>(def: WindowDef): TumblingWindow<T> | SlidingWindow<T> {
  if (def.type === "tumbling") return new TumblingWindow<T>(def.sizeMs);
  const slide = def.slideMs ?? def.sizeMs;
  return new SlidingWindow<T>(def.sizeMs, slide);
}
