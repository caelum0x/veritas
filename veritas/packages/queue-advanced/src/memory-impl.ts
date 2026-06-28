// In-memory implementations of all queue-advanced port interfaces.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type {
  QueueMessage,
  DeadLetterEntry,
  DeadLetterQueuePort,
  VisibilityQueuePort,
  VisibilityEntry,
  BatchPort,
  SchedulerPort,
  MetricsPort,
  MetricEvent,
  QueueMetrics,
  PartitionedQueuePort,
  RateLimitedQueuePort,
} from "./types.js";
import {
  QueueEmptyError,
  QueueFullError,
  PartitionNotFoundError,
  ReceiptNotFoundError,
} from "./errors.js";

// ── InMemoryDeadLetterQueue ───────────────────────────────────────────────────

export class InMemoryDeadLetterQueue<T> implements DeadLetterQueuePort<T> {
  private readonly entries: DeadLetterEntry<T>[] = [];

  constructor(private readonly capacity: number = 10_000) {}

  send(message: QueueMessage<T>, reason: string): Result<void> {
    if (this.entries.length >= this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    const entry: DeadLetterEntry<T> = {
      message,
      reason,
      deadLetteredAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    return ok(undefined);
  }

  drain(limit: number = this.entries.length): Result<DeadLetterEntry<T>[]> {
    const count = Math.min(limit, this.entries.length);
    const drained = this.entries.splice(0, count);
    return ok(drained);
  }

  size(): number {
    return this.entries.length;
  }
}

// ── InMemoryVisibilityQueue ───────────────────────────────────────────────────

interface InflightRecord<T> {
  readonly message: QueueMessage<T>;
  visibleAfter: number;
}

export class InMemoryVisibilityQueue<T> implements VisibilityQueuePort<T> {
  private readonly pending: QueueMessage<T>[] = [];
  private readonly inflight = new Map<string, InflightRecord<T>>();
  private receiptSeq = 0;

  constructor(private readonly capacity: number = 10_000) {}

  enqueue(message: QueueMessage<T>): Result<void> {
    if (this.pending.length + this.inflight.size >= this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    this.pending.push(message);
    return ok(undefined);
  }

  receive(
    visibilityTimeoutMs: number,
    now: number = Date.now()
  ): Result<VisibilityEntry<T>[]> {
    // Re-enqueue expired in-flight messages
    for (const [handle, rec] of this.inflight) {
      if (rec.visibleAfter <= now) {
        this.inflight.delete(handle);
        this.pending.unshift(rec.message);
      }
    }

    if (this.pending.length === 0) return ok([]);

    const message = this.pending.shift()!;
    const receiptHandle = `rh-${this.receiptSeq++}`;
    const visibleAfter = now + visibilityTimeoutMs;
    this.inflight.set(receiptHandle, { message, visibleAfter });

    const entry: VisibilityEntry<T> = { message, visibleAfter, receiptHandle };
    return ok([entry]);
  }

  extend(
    receiptHandle: string,
    visibilityTimeoutMs: number,
    now: number = Date.now()
  ): Result<void> {
    const rec = this.inflight.get(receiptHandle);
    if (rec === undefined) return err(new ReceiptNotFoundError(receiptHandle));
    rec.visibleAfter = now + visibilityTimeoutMs;
    return ok(undefined);
  }

  ack(receiptHandle: string): Result<void> {
    if (!this.inflight.has(receiptHandle)) {
      return err(new ReceiptNotFoundError(receiptHandle));
    }
    this.inflight.delete(receiptHandle);
    return ok(undefined);
  }

  nack(receiptHandle: string): Result<void> {
    const rec = this.inflight.get(receiptHandle);
    if (rec === undefined) return err(new ReceiptNotFoundError(receiptHandle));
    this.inflight.delete(receiptHandle);
    this.pending.unshift(rec.message);
    return ok(undefined);
  }

  size(): number {
    return this.pending.length + this.inflight.size;
  }
}

// ── InMemoryPartitionedQueue ──────────────────────────────────────────────────

export class InMemoryPartitionedQueue<T> implements PartitionedQueuePort<T> {
  private readonly queues = new Map<string, QueueMessage<T>[]>();

  constructor(private readonly capacityPerPartition: number = 10_000) {}

  enqueue(message: QueueMessage<T>, partitionKey: string): Result<void> {
    let queue = this.queues.get(partitionKey);
    if (queue === undefined) {
      queue = [];
      this.queues.set(partitionKey, queue);
    }
    if (queue.length >= this.capacityPerPartition) {
      return err(new QueueFullError(this.capacityPerPartition));
    }
    queue.push(message);
    return ok(undefined);
  }

  dequeue(partitionKey: string): Result<QueueMessage<T>> {
    const queue = this.queues.get(partitionKey);
    if (queue === undefined || queue.length === 0) {
      return err(new PartitionNotFoundError(partitionKey));
    }
    const message = queue.shift()!;
    if (queue.length === 0) this.queues.delete(partitionKey);
    return ok(message);
  }

  partitions(): string[] {
    return Array.from(this.queues.keys());
  }

  sizeOf(partitionKey: string): number {
    return this.queues.get(partitionKey)?.length ?? 0;
  }
}

// ── InMemoryRateLimitedQueue ──────────────────────────────────────────────────

export class InMemoryRateLimitedQueue<T> implements RateLimitedQueuePort<T> {
  private readonly messages: QueueMessage<T>[] = [];
  private windowStart: number = Date.now();
  private consumedInWindow: number = 0;

  constructor(
    private readonly ratePerSecond: number = 100,
    private readonly capacity: number = 10_000
  ) {}

  enqueue(message: QueueMessage<T>): Result<void> {
    if (this.messages.length >= this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    this.messages.push(message);
    return ok(undefined);
  }

  consume(now: number = Date.now()): Result<QueueMessage<T>[]> {
    const elapsed = now - this.windowStart;
    if (elapsed >= 1000) {
      this.windowStart = now;
      this.consumedInWindow = 0;
    }

    const remaining = this.ratePerSecond - this.consumedInWindow;
    if (remaining <= 0) return ok([]);

    const count = Math.min(remaining, this.messages.length);
    const batch = this.messages.splice(0, count);
    this.consumedInWindow += batch.length;
    return ok(batch);
  }

  size(): number {
    return this.messages.length;
  }
}

// ── InMemoryBatchQueue ────────────────────────────────────────────────────────

export class InMemoryBatchQueue<T> implements BatchPort<T> {
  private readonly messages: QueueMessage<T>[] = [];

  constructor(private readonly capacity: number = 10_000) {}

  enqueueMany(messages: ReadonlyArray<QueueMessage<T>>): Result<void> {
    if (this.messages.length + messages.length > this.capacity) {
      return err(new QueueFullError(this.capacity));
    }
    for (const m of messages) {
      this.messages.push(m);
    }
    return ok(undefined);
  }

  consumeBatch(maxMessages: number): Result<QueueMessage<T>[]> {
    if (this.messages.length === 0) return ok([]);
    const count = Math.min(maxMessages, this.messages.length);
    return ok(this.messages.splice(0, count));
  }
}

// ── InMemoryScheduler ─────────────────────────────────────────────────────────

interface ScheduledMessage<T> {
  readonly runAt: number;
  readonly message: QueueMessage<T>;
}

export class InMemoryScheduler<T> implements SchedulerPort<T> {
  private readonly scheduled: ScheduledMessage<T>[] = [];

  schedule(message: QueueMessage<T>, runAt: string): Result<void> {
    const ts = Date.parse(runAt);
    if (Number.isNaN(ts)) {
      return err(new QueueEmptyError());
    }
    const entry: ScheduledMessage<T> = { runAt: ts, message };
    const idx = this.insertionIndex(ts);
    this.scheduled.splice(idx, 0, entry);
    return ok(undefined);
  }

  tick(now: number = Date.now()): Result<QueueMessage<T>[]> {
    const ready: QueueMessage<T>[] = [];
    while (this.scheduled.length > 0 && this.scheduled[0]!.runAt <= now) {
      ready.push(this.scheduled.shift()!.message);
    }
    return ok(ready);
  }

  pending(): number {
    return this.scheduled.length;
  }

  private insertionIndex(runAt: number): number {
    let lo = 0;
    let hi = this.scheduled.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.scheduled[mid]!.runAt <= runAt) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

// ── InMemoryMetrics ───────────────────────────────────────────────────────────

export class InMemoryMetrics implements MetricsPort {
  private enqueueCount = 0;
  private consumeCount = 0;
  private depth = 0;
  private dlqDepth = 0;
  private inFlight = 0;
  private oldestEnqueuedAt: number | null = null;
  private windowStart = Date.now();
  private windowEnqueue = 0;
  private windowConsume = 0;

  record(event: MetricEvent): void {
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.windowEnqueue = 0;
      this.windowConsume = 0;
    }

    if (event.kind === "enqueue") {
      this.enqueueCount++;
      this.windowEnqueue++;
      if (this.oldestEnqueuedAt === null) this.oldestEnqueuedAt = event.timestamp;
    } else if (event.kind === "consume") {
      this.consumeCount++;
      this.windowConsume++;
      this.oldestEnqueuedAt = null;
    } else if (event.kind === "depth") {
      this.depth = event.value;
    } else if (event.kind === "dlqDepth") {
      this.dlqDepth = event.value;
    } else if (event.kind === "inFlight") {
      this.inFlight = event.value;
    }
  }

  snapshot(): QueueMetrics {
    const now = Date.now();
    return {
      queueDepth: this.depth,
      dlqDepth: this.dlqDepth,
      inFlightCount: this.inFlight,
      enqueueRate: this.windowEnqueue,
      consumeRate: this.windowConsume,
      oldestMessageAgeMs:
        this.oldestEnqueuedAt !== null ? now - this.oldestEnqueuedAt : 0,
    };
  }
}
