// Dead-letter queue: captures unprocessable messages with failure reasons for inspection.
import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import type { QueueMessage, DeadLetterQueuePort, DeadLetterEntry } from "./types.js";

export class InMemoryDeadLetterQueue<T> implements DeadLetterQueuePort<T> {
  private readonly entries: DeadLetterEntry<T>[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 50_000) {
    this.maxSize = maxSize;
  }

  send(message: QueueMessage<T>, reason: string): Result<void> {
    if (this.entries.length >= this.maxSize) {
      // Evict the oldest entry to make room (ring-buffer behaviour)
      this.entries.shift();
    }
    const entry: DeadLetterEntry<T> = {
      message,
      reason,
      deadLetteredAt: epochToIso(Date.now()),
    };
    this.entries.push(entry);
    return ok(undefined);
  }

  drain(limit: number = this.entries.length): Result<DeadLetterEntry<T>[]> {
    const count = Math.min(limit, this.entries.length);
    const drained = this.entries.splice(0, count);
    return ok(drained);
  }

  peek(limit: number = 10): DeadLetterEntry<T>[] {
    return this.entries.slice(0, limit);
  }

  size(): number {
    return this.entries.length;
  }
}
