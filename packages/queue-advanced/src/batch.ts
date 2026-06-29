// Batch consumer: drains up to N visible messages atomically, returning them with receipt handles.
import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";
import type { QueueMessage, ConsumeOptions } from "./types.js";
import type { PriorityQueuePort } from "./types.js";
import { isOk } from "@veritas/core";
import { AckProcessor } from "./ack.js";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_VISIBILITY_MS = 30_000;

/** A single item yielded by a batch consume operation */
export interface BatchItem<T> {
  readonly message: QueueMessage<T>;
  readonly receiptHandle: string;
}

/** Result of a batch consume call */
export interface BatchResult<T> {
  readonly items: ReadonlyArray<BatchItem<T>>;
}

/** Port for batch-consuming from a queue */
export interface BatchConsumerPort<T> {
  consume(options?: ConsumeOptions): Result<BatchResult<T>>;
  ackAll(receiptHandles: readonly string[]): Result<void>;
  nackAll(receiptHandles: readonly string[]): void;
}

/**
 * Wraps a PriorityQueuePort with batch-consume semantics backed by an AckProcessor.
 * Dequeues up to maxMessages, starts visibility timers, and returns receipt handles.
 */
export class BatchConsumer<T> implements BatchConsumerPort<T> {
  private readonly processor: AckProcessor<T>;

  constructor(
    private readonly queue: PriorityQueuePort<T>,
    processorOptions: ConstructorParameters<typeof AckProcessor>[0] = {}
  ) {
    this.processor = new AckProcessor<T>(processorOptions);
  }

  consume(options: ConsumeOptions = {}): Result<BatchResult<T>> {
    const maxMessages = options.maxMessages ?? DEFAULT_BATCH_SIZE;
    const visibilityTimeoutMs =
      options.visibilityTimeoutMs ?? DEFAULT_VISIBILITY_MS;

    const items: BatchItem<T>[] = [];

    for (let i = 0; i < maxMessages; i++) {
      const result = this.queue.dequeue();
      if (!isOk(result)) break;
      const message = (result as { value: QueueMessage<T> }).value;
      const receiptHandle = this.processor.checkout(
        message,
        visibilityTimeoutMs
      );
      items.push({ message, receiptHandle });
    }

    return ok({ items });
  }

  /** Ack a batch of messages by their receipt handles */
  ackAll(receiptHandles: readonly string[]): Result<void> {
    for (const handle of receiptHandles) {
      this.processor.ack(handle);
    }
    return ok(undefined);
  }

  /** Nack a batch; each message follows its own requeue/dead-letter policy */
  nackAll(receiptHandles: readonly string[]): void {
    for (const handle of receiptHandles) {
      this.processor.nack(handle);
    }
  }

  /** Reclaim expired in-flight messages and re-enqueue visible ones */
  reclaim(now?: number): QueueMessage<T>[] {
    return this.processor.reclaim(now);
  }

  /** Number of currently in-flight messages across all batch operations */
  inFlightCount(): number {
    return this.processor.inFlightCount();
  }
}
