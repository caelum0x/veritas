// Partitioned queue: isolates messages by partition key for ordered per-key delivery.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueueMessage, PartitionedQueuePort } from "./types.js";
import { QueueEmptyError, PartitionNotFoundError } from "./errors.js";

export class InMemoryPartitionedQueue<T> implements PartitionedQueuePort<T> {
  private readonly store = new Map<string, QueueMessage<T>[]>();

  enqueue(message: QueueMessage<T>, partitionKey: string): Result<void> {
    const existing = this.store.get(partitionKey);
    if (existing !== undefined) {
      this.store.set(partitionKey, [...existing, message]);
    } else {
      this.store.set(partitionKey, [message]);
    }
    return ok(undefined);
  }

  dequeue(partitionKey: string): Result<QueueMessage<T>> {
    const queue = this.store.get(partitionKey);
    if (queue === undefined) {
      return err(new PartitionNotFoundError(partitionKey));
    }
    if (queue.length === 0) {
      return err(new QueueEmptyError());
    }
    const [head, ...tail] = queue;
    this.store.set(partitionKey, tail);
    return ok(head!);
  }

  partitions(): string[] {
    return Array.from(this.store.keys());
  }

  sizeOf(partitionKey: string): number {
    return this.store.get(partitionKey)?.length ?? 0;
  }

  totalSize(): number {
    let total = 0;
    for (const q of this.store.values()) total += q.length;
    return total;
  }
}
