// In-memory job queue: dequeue-with-lock semantics for the ingestion worker.

import { newJobId } from "@veritas/core";
import type { JobId } from "@veritas/core";

export interface QueuedJob {
  readonly id: JobId;
  readonly sourceUrl: string;
  readonly mimeType?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly idempotencyKey?: string;
  readonly enqueuedAt: string;
}

export interface JobQueue {
  enqueue(job: Omit<QueuedJob, "id" | "enqueuedAt">): QueuedJob;
  dequeue(): QueuedJob | undefined;
  size(): number;
  peek(): readonly QueuedJob[];
}

/** Thread-safe (single-threaded JS) in-memory FIFO queue. */
export class InMemoryJobQueue implements JobQueue {
  readonly #items: QueuedJob[] = [];

  enqueue(job: Omit<QueuedJob, "id" | "enqueuedAt">): QueuedJob {
    const queued: QueuedJob = {
      ...job,
      id: newJobId(),
      enqueuedAt: new Date().toISOString(),
    };
    this.#items.push(queued);
    return queued;
  }

  dequeue(): QueuedJob | undefined {
    return this.#items.shift();
  }

  size(): number {
    return this.#items.length;
  }

  peek(): readonly QueuedJob[] {
    return [...this.#items];
  }
}
