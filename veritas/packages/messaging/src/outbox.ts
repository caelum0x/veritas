// Transactional outbox — buffer messages for reliable at-least-once delivery
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { Message } from "./message.js";
import { MessagingError } from "./errors.js";

export interface OutboxEntry<TPayload = unknown> {
  readonly id: string;
  readonly message: Message<TPayload>;
  readonly createdAt: number;
  processedAt: number | null;
  attempts: number;
}

export interface Outbox {
  add<TPayload>(message: Message<TPayload>): Promise<Result<OutboxEntry<TPayload>, MessagingError>>;
  markProcessed(id: string): Promise<Result<void, MessagingError>>;
  pending(limit?: number): Promise<Result<OutboxEntry[], MessagingError>>;
  remove(id: string): Promise<Result<void, MessagingError>>;
  clear(): Promise<Result<void, MessagingError>>;
}

export interface OutboxOptions {
  readonly logger?: Logger;
  readonly maxSize?: number;
}

/** In-memory transactional outbox — swap for a DB-backed implementation in production. */
export class InMemoryOutbox implements Outbox {
  private readonly store = new Map<string, OutboxEntry>();
  private readonly logger?: Logger;
  private readonly maxSize: number;

  constructor(options: OutboxOptions = {}) {
    this.logger = options.logger;
    this.maxSize = options.maxSize ?? 10_000;
  }

  async add<TPayload>(
    message: Message<TPayload>
  ): Promise<Result<OutboxEntry<TPayload>, MessagingError>> {
    if (this.store.size >= this.maxSize) {
      const e = new MessagingError("OUTBOX_FULL", "Outbox capacity exceeded");
      this.logger?.warn("outbox.full", { maxSize: this.maxSize });
      return err(e);
    }

    const entry: OutboxEntry<TPayload> = {
      id: message.id,
      message,
      createdAt: Date.now(),
      processedAt: null,
      attempts: 0,
    };

    this.store.set(entry.id, entry as OutboxEntry);
    this.logger?.debug("outbox.add", { id: entry.id, topic: message.topic });
    return ok(entry);
  }

  async markProcessed(id: string): Promise<Result<void, MessagingError>> {
    const entry = this.store.get(id);
    if (!entry) {
      return err(new MessagingError("NOT_FOUND", `Outbox entry not found: ${id}`));
    }
    entry.processedAt = Date.now();
    entry.attempts += 1;
    this.logger?.debug("outbox.processed", { id });
    return ok(undefined);
  }

  async pending(limit = 100): Promise<Result<OutboxEntry[], MessagingError>> {
    const results: OutboxEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.processedAt === null) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }
    return ok(results);
  }

  async remove(id: string): Promise<Result<void, MessagingError>> {
    if (!this.store.has(id)) {
      return err(new MessagingError("NOT_FOUND", `Outbox entry not found: ${id}`));
    }
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
