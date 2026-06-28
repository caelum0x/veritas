// Visibility timeout: tracks in-flight messages and re-enqueues them if not acked in time.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueueMessage } from "./types.js";
import { QueueEmptyError } from "./errors.js";

export class VisibilityTimeoutError extends Error {
  constructor(handle: string) {
    super(`Receipt handle '${handle}' is invalid or already resolved`);
    this.name = "VisibilityTimeoutError";
  }
}

interface InFlightRecord<T> {
  readonly message: QueueMessage<T>;
  readonly receiptHandle: string;
  readonly deadline: number; // absolute epoch ms
}

/** Port implemented by VisibilityTracker */
export interface VisibilityTrackerPort<T> {
  /** Mark a message as in-flight; returns a receipt handle */
  checkedOut(message: QueueMessage<T>, visibilityTimeoutMs: number): string;
  /** Extend the visibility deadline for an in-flight message */
  extend(receiptHandle: string, additionalMs: number): Result<void>;
  /** Acknowledge successful processing; removes the in-flight record */
  ack(receiptHandle: string): Result<void>;
  /** Nack – immediately return message to the re-enqueue list */
  nack(receiptHandle: string): Result<QueueMessage<T>>;
  /** Return all messages whose visibility deadline has passed (to be re-enqueued) */
  expired(now?: number): QueueMessage<T>[];
}

/** In-memory implementation of visibility timeout tracking */
export class InMemoryVisibilityTracker<T> implements VisibilityTrackerPort<T> {
  private readonly inFlight = new Map<string, InFlightRecord<T>>();
  private counter = 0;

  checkedOut(message: QueueMessage<T>, visibilityTimeoutMs: number): string {
    const receiptHandle = `rh-${message.id}-${++this.counter}`;
    const record: InFlightRecord<T> = {
      message,
      receiptHandle,
      deadline: Date.now() + Math.max(0, visibilityTimeoutMs),
    };
    this.inFlight.set(receiptHandle, record);
    return receiptHandle;
  }

  extend(receiptHandle: string, additionalMs: number): Result<void> {
    const record = this.inFlight.get(receiptHandle);
    if (record === undefined) {
      return err(new VisibilityTimeoutError(receiptHandle));
    }
    const updated: InFlightRecord<T> = {
      ...record,
      deadline: record.deadline + Math.max(0, additionalMs),
    };
    this.inFlight.set(receiptHandle, updated);
    return ok(undefined);
  }

  ack(receiptHandle: string): Result<void> {
    if (!this.inFlight.has(receiptHandle)) {
      return err(new VisibilityTimeoutError(receiptHandle));
    }
    this.inFlight.delete(receiptHandle);
    return ok(undefined);
  }

  nack(receiptHandle: string): Result<QueueMessage<T>> {
    const record = this.inFlight.get(receiptHandle);
    if (record === undefined) {
      return err(new QueueEmptyError());
    }
    this.inFlight.delete(receiptHandle);
    return ok(record.message);
  }

  expired(now: number = Date.now()): QueueMessage<T>[] {
    const ready: QueueMessage<T>[] = [];
    for (const [handle, record] of this.inFlight) {
      if (record.deadline <= now) {
        ready.push(record.message);
        this.inFlight.delete(handle);
      }
    }
    return ready;
  }

  /** Total number of currently in-flight messages */
  inFlightCount(): number {
    return this.inFlight.size;
  }
}
