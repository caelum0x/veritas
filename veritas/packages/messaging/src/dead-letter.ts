// Dead-letter queue — captures messages that exhausted all retry attempts
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { Message } from "./message.js";
import { MessagingError } from "./errors.js";

export interface DeadLetterEntry<TPayload = unknown> {
  readonly id: string;
  readonly message: Message<TPayload>;
  readonly reason: string;
  readonly attempts: number;
  readonly firstFailedAt: number;
  readonly lastFailedAt: number;
  readonly error: string;
}

export interface DeadLetterQueue {
  enqueue<TPayload>(
    message: Message<TPayload>,
    opts: { reason: string; attempts: number; error: unknown }
  ): Promise<Result<DeadLetterEntry<TPayload>, MessagingError>>;
  list(limit?: number): Promise<Result<DeadLetterEntry[], MessagingError>>;
  get(id: string): Promise<Result<DeadLetterEntry | null, MessagingError>>;
  remove(id: string): Promise<Result<void, MessagingError>>;
  clear(): Promise<Result<void, MessagingError>>;
}

export interface DeadLetterQueueOptions {
  readonly logger?: Logger;
  readonly maxSize?: number;
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  return String(error);
}

/** In-memory DLQ — swap for persistent storage in production. */
export class InMemoryDeadLetterQueue implements DeadLetterQueue {
  private readonly store = new Map<string, DeadLetterEntry>();
  private readonly logger?: Logger;
  private readonly maxSize: number;

  constructor(options: DeadLetterQueueOptions = {}) {
    this.logger = options.logger;
    this.maxSize = options.maxSize ?? 5_000;
  }

  async enqueue<TPayload>(
    message: Message<TPayload>,
    opts: { reason: string; attempts: number; error: unknown }
  ): Promise<Result<DeadLetterEntry<TPayload>, MessagingError>> {
    if (this.store.size >= this.maxSize) {
      return err(new MessagingError("DLQ_FULL", "Dead-letter queue capacity exceeded"));
    }

    const now = Date.now();
    const existing = this.store.get(message.id) as DeadLetterEntry<TPayload> | undefined;

    const entry: DeadLetterEntry<TPayload> = {
      id: message.id,
      message,
      reason: opts.reason,
      attempts: opts.attempts,
      firstFailedAt: existing?.firstFailedAt ?? now,
      lastFailedAt: now,
      error: errorToString(opts.error),
    };

    this.store.set(entry.id, entry as DeadLetterEntry);
    this.logger?.warn("dlq.enqueued", { id: entry.id, topic: message.topic, reason: opts.reason });
    return ok(entry);
  }

  async list(limit = 100): Promise<Result<DeadLetterEntry[], MessagingError>> {
    const results: DeadLetterEntry[] = [];
    for (const entry of this.store.values()) {
      results.push(entry);
      if (results.length >= limit) break;
    }
    return ok(results);
  }

  async get(id: string): Promise<Result<DeadLetterEntry | null, MessagingError>> {
    return ok(this.store.get(id) ?? null);
  }

  async remove(id: string): Promise<Result<void, MessagingError>> {
    this.store.delete(id);
    return ok(undefined);
  }

  async clear(): Promise<Result<void, MessagingError>> {
    this.store.clear();
    return ok(undefined);
  }

  get size(): number {
    return this.store.size;
  }
}
