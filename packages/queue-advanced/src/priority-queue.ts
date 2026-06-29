// Priority queue: enqueue with numeric priority, highest priority dequeued first.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueueMessage, PriorityQueuePort } from "./types.js";
import { QueueEmptyError, QueueFullError } from "./errors.js";

interface PrioritizedEntry<T> {
  readonly priority: number;
  readonly seq: number;
  readonly message: QueueMessage<T>;
}

export class InMemoryPriorityQueue<T> implements PriorityQueuePort<T> {
  private readonly heap: PrioritizedEntry<T>[] = [];
  private seq = 0;

  constructor(private readonly capacity: number = 10_000) {}

  enqueue(message: QueueMessage<T>, priority: number): Result<void> {
    if (this.heap.length >= this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    const entry: PrioritizedEntry<T> = { priority, seq: this.seq++, message };
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
    return ok(undefined);
  }

  dequeue(): Result<QueueMessage<T>> {
    if (this.heap.length === 0) return err(new QueueEmptyError());
    const top = this.heap[0]!;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return ok(top.message);
  }

  peek(): Result<QueueMessage<T>> {
    if (this.heap.length === 0) return err(new QueueEmptyError());
    return ok(this.heap[0]!.message);
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private compare(a: PrioritizedEntry<T>, b: PrioritizedEntry<T>): boolean {
    // Higher priority wins; ties broken by insertion order (lower seq = older = higher priority)
    if (a.priority !== b.priority) return a.priority > b.priority;
    return a.seq < b.seq;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[i]!, this.heap[parent]!)) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent]!, this.heap[i]!];
        i = parent;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    for (;;) {
      let best = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.compare(this.heap[l]!, this.heap[best]!)) best = l;
      if (r < n && this.compare(this.heap[r]!, this.heap[best]!)) best = r;
      if (best === i) break;
      [this.heap[i], this.heap[best]] = [this.heap[best]!, this.heap[i]!];
      i = best;
    }
  }
}
