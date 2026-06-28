// Shared type primitives for the @veritas/messaging package
import { IsoTimestamp, JsonValue } from "@veritas/core";

/** Unique identifier for a message */
export type MessageId = string & { readonly __brand: "MessageId" };

/** Topic/channel identifier */
export type Topic = string & { readonly __brand: "Topic" };

/** Creates a branded MessageId */
export const asMessageId = (id: string): MessageId => id as MessageId;

/** Creates a branded Topic */
export const asTopic = (t: string): Topic => t as Topic;

/** Message priority levels */
export type MessagePriority = "low" | "normal" | "high" | "critical";

/** Delivery guarantee semantics */
export type DeliverySemantics = "at-most-once" | "at-least-once" | "exactly-once";

/** Message metadata headers */
export interface MessageHeaders {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly traceId?: string;
  readonly contentType?: string;
  readonly [key: string]: string | undefined;
}

/** Core message envelope (immutable) */
export interface MessageEnvelope<T extends JsonValue = JsonValue> {
  readonly id: MessageId;
  readonly topic: Topic;
  readonly payload: T;
  readonly headers: MessageHeaders;
  readonly priority: MessagePriority;
  readonly timestamp: IsoTimestamp;
  readonly attemptCount: number;
  readonly maxAttempts: number;
}

/** Options for publishing a message */
export interface PublishOptions {
  readonly priority?: MessagePriority;
  readonly headers?: MessageHeaders;
  readonly maxAttempts?: number;
  readonly delayMs?: number;
}

/** Options for subscribing to a topic */
export interface SubscribeOptions {
  readonly concurrency?: number;
  readonly semantics?: DeliverySemantics;
}

/** Result of a handler execution */
export type HandlerResult = "ack" | "nack" | "dead-letter";

/** Subscription handle returned on subscribe */
export interface Subscription {
  readonly topic: Topic;
  readonly id: string;
  unsubscribe(): void;
}

/** Outbox record for transactional outbox pattern */
export interface OutboxRecord<T extends JsonValue = JsonValue> {
  readonly id: MessageId;
  readonly topic: Topic;
  readonly payload: T;
  readonly headers: MessageHeaders;
  readonly priority: MessagePriority;
  readonly createdAt: IsoTimestamp;
  readonly scheduledAt: IsoTimestamp;
  readonly processedAt?: IsoTimestamp;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly status: "pending" | "processing" | "processed" | "failed";
}

/** Inbox record for idempotent inbox pattern */
export interface InboxRecord {
  readonly messageId: MessageId;
  readonly topic: Topic;
  readonly receivedAt: IsoTimestamp;
  readonly processedAt: IsoTimestamp;
}

/** Dead letter record */
export interface DeadLetterRecord<T extends JsonValue = JsonValue> {
  readonly id: string;
  readonly originalMessageId: MessageId;
  readonly topic: Topic;
  readonly payload: T;
  readonly headers: MessageHeaders;
  readonly reason: string;
  readonly failedAt: IsoTimestamp;
  readonly attempts: number;
}

/** Retry policy configuration */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maxDelayMs: number;
  readonly jitter: boolean;
}

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
  jitter: true,
} as const;
