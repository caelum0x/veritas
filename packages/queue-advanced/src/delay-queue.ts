// Delay queue: messages become visible only after a specified delay elapses.
import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";
import type { QueueMessage, DelayQueuePort } from "./types.js";

interface ScheduledEntry<T> {
  readonly visibleAt: number;
  readonly message: QueueMessage<T>;
}

export class InMemoryDelayQueue<T> implements DelayQueuePort<T> {
  private readonly entries: ScheduledEntry<T>[] = [];

  enqueue(message: QueueMessage<T>, delayMs: number): Result<void> {
    const visibleAt = Date.now() + Math.max(0, delayMs);
    // Keep sorted by visibleAt ascending for efficient polling
    const entry: ScheduledEntry<T> = { visibleAt, message };
    const idx = this.insertionIndex(visibleAt);
    this.entries.splice(idx, 0, entry);
    return ok(undefined);
  }

  poll(now: number = Date.now()): Result<QueueMessage<T>[]> {
    const ready: QueueMessage<T>[] = [];
    while (this.entries.length > 0 && this.entries[0]!.visibleAt <= now) {
      ready.push(this.entries.shift()!.message);
    }
    return ok(ready);
  }

  size(): number {
    return this.entries.length;
  }

  private insertionIndex(visibleAt: number): number {
    let lo = 0;
    let hi = this.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.entries[mid]!.visibleAt <= visibleAt) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
