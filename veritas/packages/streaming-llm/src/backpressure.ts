// Bounded async queue providing backpressure between a fast producer and a slow consumer.

import { BackpressureOverflowError } from "./errors.js";
import type { ChunkSink } from "./types.js";
import type { StreamChunk } from "./chunk.js";

type QueueItem<T> =
  | { readonly kind: "value"; readonly value: T }
  | { readonly kind: "end" }
  | { readonly kind: "error"; readonly err: unknown };

/** Async bounded queue; push() resolves when the consumer has drained below the high-water mark. */
export class BoundedQueue<T> {
  private readonly queue: Array<QueueItem<T>> = [];
  private readonly waiters: Array<() => void> = [];
  private done = false;

  constructor(private readonly capacity: number) {}

  /** Enqueue a value. Throws BackpressureOverflowError when queue is at capacity. */
  enqueue(item: QueueItem<T>): void {
    if (this.done) return;
    if (this.queue.length >= this.capacity) {
      throw new BackpressureOverflowError(
        `Queue capacity ${this.capacity} exceeded`,
      );
    }
    this.queue.push(item);
    const waiter = this.waiters.shift();
    if (waiter !== undefined) waiter();
  }

  /** Dequeue the next item, waiting until one is available. */
  async dequeue(): Promise<QueueItem<T>> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
    return this.queue.shift()!;
  }

  get size(): number {
    return this.queue.length;
  }
}

/**
 * Creates a ChunkSink backed by a BoundedQueue, and returns the sink together with an
 * async iterator that a consumer can iterate over.
 */
export function createBackpressureSink(
  capacity = 256,
): { sink: ChunkSink; iterator: AsyncIterableIterator<StreamChunk> } {
  const queue = new BoundedQueue<StreamChunk>(capacity);

  const sink: ChunkSink = {
    async push(chunk: StreamChunk): Promise<void> {
      queue.enqueue({ kind: "value", value: chunk });
    },
    end(): void {
      queue.enqueue({ kind: "end" });
    },
    error(err: unknown): void {
      queue.enqueue({ kind: "error", err });
    },
  };

  async function* makeIterator(): AsyncIterableIterator<StreamChunk> {
    while (true) {
      const item = await queue.dequeue();
      if (item.kind === "end") return;
      if (item.kind === "error") throw item.err;
      yield item.value;
    }
  }

  return { sink, iterator: makeIterator() };
}
