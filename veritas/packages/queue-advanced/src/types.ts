// Shared types for @veritas/queue-advanced: messages, ports, and options.
import type { Result } from "@veritas/core";

export interface QueueMessage<T> {
  readonly id: string;
  readonly payload: T;
  readonly enqueuedAt: string;
  readonly attempts: number;
  readonly metadata: Record<string, unknown>;
}

export interface ConsumeOptions {
  readonly maxMessages?: number;
  readonly visibilityTimeoutMs?: number;
}

export interface PriorityQueuePort<T> {
  enqueue(message: QueueMessage<T>, priority: number): Result<void>;
  dequeue(): Result<QueueMessage<T>>;
  peek(): Result<QueueMessage<T>>;
  size(): number;
  isEmpty(): boolean;
}

export interface DelayQueuePort<T> {
  enqueue(message: QueueMessage<T>, delayMs: number): Result<void>;
  poll(now?: number): Result<QueueMessage<T>[]>;
  size(): number;
}

export interface PartitionedQueuePort<T> {
  enqueue(message: QueueMessage<T>, partitionKey: string): Result<void>;
  dequeue(partitionKey: string): Result<QueueMessage<T>>;
  partitions(): string[];
  sizeOf(partitionKey: string): number;
}

export interface RateLimitedQueuePort<T> {
  enqueue(message: QueueMessage<T>): Result<void>;
  consume(now?: number): Result<QueueMessage<T>[]>;
  size(): number;
}

export interface DeadLetterQueuePort<T> {
  send(message: QueueMessage<T>, reason: string): Result<void>;
  drain(limit?: number): Result<DeadLetterEntry<T>[]>;
  size(): number;
}

export interface DeadLetterEntry<T> {
  readonly message: QueueMessage<T>;
  readonly reason: string;
  readonly deadLetteredAt: string;
}

export interface VisibilityEntry<T> {
  readonly message: QueueMessage<T>;
  readonly visibleAfter: number;
  readonly receiptHandle: string;
}

export interface VisibilityQueuePort<T> {
  enqueue(message: QueueMessage<T>): Result<void>;
  receive(visibilityTimeoutMs: number, now?: number): Result<VisibilityEntry<T>[]>;
  extend(receiptHandle: string, visibilityTimeoutMs: number, now?: number): Result<void>;
  ack(receiptHandle: string): Result<void>;
  nack(receiptHandle: string): Result<void>;
  size(): number;
}

export interface AckEntry<T> {
  readonly message: QueueMessage<T>;
  readonly receiptHandle: string;
}

export interface AckPort<T> {
  ack(receiptHandle: string): Result<void>;
  nack(receiptHandle: string): Result<void>;
}

export interface BatchPort<T> {
  enqueueMany(messages: ReadonlyArray<QueueMessage<T>>): Result<void>;
  consumeBatch(maxMessages: number): Result<QueueMessage<T>[]>;
}

export interface SchedulerPort<T> {
  schedule(message: QueueMessage<T>, runAt: string): Result<void>;
  tick(now?: number): Result<QueueMessage<T>[]>;
  pending(): number;
}

export interface QueueMetrics {
  readonly queueDepth: number;
  readonly dlqDepth: number;
  readonly inFlightCount: number;
  readonly enqueueRate: number;
  readonly consumeRate: number;
  readonly oldestMessageAgeMs: number;
}

export interface MetricsPort {
  record(event: MetricEvent): void;
  snapshot(): QueueMetrics;
}

export type MetricEvent =
  | { readonly kind: "enqueue"; readonly timestamp: number }
  | { readonly kind: "consume"; readonly timestamp: number }
  | { readonly kind: "dlq"; readonly timestamp: number }
  | { readonly kind: "depth"; readonly value: number }
  | { readonly kind: "dlqDepth"; readonly value: number }
  | { readonly kind: "inFlight"; readonly value: number };
