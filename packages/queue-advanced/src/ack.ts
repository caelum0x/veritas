// Ack/nack processor: combines visibility tracking with re-enqueue logic on nack or timeout.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QueueMessage } from "./types.js";
import { InMemoryVisibilityTracker } from "./visibility.js";
import { QueueEmptyError } from "./errors.js";

/** Outcome after nacking a message */
export type NackDisposition =
  | { readonly action: "requeue"; readonly delayMs: number }
  | { readonly action: "dead-letter"; readonly reason: string };

/** Options for AckProcessor */
export interface AckProcessorOptions {
  readonly defaultVisibilityTimeoutMs?: number;
  /** Called when a message is re-queued after nack / timeout */
  readonly onRequeue?: <T>(message: QueueMessage<T>, delayMs: number) => void;
  /** Called when a message is dead-lettered */
  readonly onDeadLetter?: <T>(message: QueueMessage<T>, reason: string) => void;
  /** Max attempts before dead-lettering on nack */
  readonly maxAttempts?: number;
  /** Base backoff delay in ms applied to requeued messages */
  readonly baseBackoffMs?: number;
}

const DEFAULTS = {
  defaultVisibilityTimeoutMs: 30_000,
  maxAttempts: 5,
  baseBackoffMs: 1_000,
} as const;

/** Coordinates ack/nack lifecycle for in-flight messages */
export class AckProcessor<T> {
  private readonly tracker: InMemoryVisibilityTracker<T>;
  private readonly opts: Required<
    Omit<AckProcessorOptions, "onRequeue" | "onDeadLetter">
  > & {
    readonly onRequeue?: AckProcessorOptions["onRequeue"];
    readonly onDeadLetter?: AckProcessorOptions["onDeadLetter"];
  };

  constructor(options: AckProcessorOptions = {}) {
    this.tracker = new InMemoryVisibilityTracker<T>();
    this.opts = {
      defaultVisibilityTimeoutMs:
        options.defaultVisibilityTimeoutMs ??
        DEFAULTS.defaultVisibilityTimeoutMs,
      maxAttempts: options.maxAttempts ?? DEFAULTS.maxAttempts,
      baseBackoffMs: options.baseBackoffMs ?? DEFAULTS.baseBackoffMs,
      onRequeue: options.onRequeue,
      onDeadLetter: options.onDeadLetter,
    };
  }

  /** Check out a message and start its visibility timer; returns receipt handle */
  checkout(
    message: QueueMessage<T>,
    visibilityTimeoutMs?: number
  ): string {
    return this.tracker.checkedOut(
      message,
      visibilityTimeoutMs ?? this.opts.defaultVisibilityTimeoutMs
    );
  }

  /** Acknowledge successful processing */
  ack(receiptHandle: string): Result<void> {
    return this.tracker.ack(receiptHandle);
  }

  /**
   * Nack a message. If attempts < maxAttempts, re-enqueues with backoff;
   * otherwise dead-letters it.
   */
  nack(receiptHandle: string, reason?: string): Result<NackDisposition> {
    const result = this.tracker.nack(receiptHandle);
    if (!("value" in result)) return err((result as { error: unknown }).error);

    const message = (result as { value: QueueMessage<T> }).value;
    const attempts = message.attempts + 1;

    if (attempts >= this.opts.maxAttempts) {
      const dlReason = reason ?? "max attempts exceeded";
      this.opts.onDeadLetter?.(message, dlReason);
      return ok({ action: "dead-letter", reason: dlReason });
    }

    const delayMs = this.opts.baseBackoffMs * Math.pow(2, attempts - 1);
    this.opts.onRequeue?.(message, delayMs);
    return ok({ action: "requeue", delayMs });
  }

  /** Extend visibility deadline for a checked-out message */
  extendVisibility(
    receiptHandle: string,
    additionalMs: number
  ): Result<void> {
    return this.tracker.extend(receiptHandle, additionalMs);
  }

  /**
   * Scan for expired in-flight messages and invoke requeue/dead-letter callbacks.
   * Returns the list of messages that were reclaimed.
   */
  reclaim(now?: number): QueueMessage<T>[] {
    const expired = this.tracker.expired(now);
    for (const message of expired) {
      const attempts = message.attempts + 1;
      if (attempts >= this.opts.maxAttempts) {
        this.opts.onDeadLetter?.(message, "visibility timeout exceeded");
      } else {
        const delayMs = this.opts.baseBackoffMs * Math.pow(2, attempts - 1);
        this.opts.onRequeue?.(message, delayMs);
      }
    }
    return expired;
  }

  /** Number of currently in-flight messages */
  inFlightCount(): number {
    return this.tracker.inFlightCount();
  }
}
