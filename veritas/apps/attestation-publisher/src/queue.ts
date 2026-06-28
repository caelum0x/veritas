// In-memory FIFO queue of pending attestation hashes awaiting batch anchoring.

import type { ContentHash } from "@veritas/core";

export interface QueueEntry {
  readonly hash: ContentHash;
  readonly reportId: string;
  readonly enqueuedAt: number;
}

/** Thread-safe (single-threaded JS) FIFO queue for content hashes pending on-chain anchoring. */
export class AttestationQueue {
  private readonly entries: QueueEntry[] = [];

  /** Add a content hash to the end of the queue. */
  enqueue(hash: ContentHash, reportId: string): void {
    this.entries.push({ hash, reportId, enqueuedAt: Date.now() });
  }

  /**
   * Drain up to `max` entries from the front of the queue.
   * Returns the drained entries and removes them from the queue.
   */
  drain(max: number): readonly QueueEntry[] {
    const count = Math.min(max, this.entries.length);
    return this.entries.splice(0, count);
  }

  /** Re-enqueue entries (e.g. on anchor failure) at the front for retry. */
  requeue(entries: readonly QueueEntry[]): void {
    this.entries.unshift(...entries);
  }

  /** Current number of pending entries. */
  get size(): number {
    return this.entries.length;
  }

  /** Whether the queue has at least one entry. */
  get isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /** Peek at the oldest entry without removing it. */
  peek(): QueueEntry | undefined {
    return this.entries[0];
  }
}
