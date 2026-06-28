// Idempotent inbox — deduplicates messages by id within a TTL window
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { Message } from "./message.js";
import { MessagingError } from "./errors.js";

export interface InboxRecord {
  readonly id: string;
  readonly topic: string;
  readonly receivedAt: number;
  readonly expiresAt: number;
}

export interface Inbox {
  /** Returns ok(true) if new (not seen), ok(false) if duplicate. */
  accept(message: Message): Promise<Result<boolean, MessagingError>>;
  has(id: string): Promise<Result<boolean, MessagingError>>;
  evictExpired(): Promise<Result<number, MessagingError>>;
}

export interface InboxOptions {
  readonly ttlMs?: number;
  readonly logger?: Logger;
  readonly maxSize?: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** In-memory idempotent inbox — evict expired records periodically. */
export class InMemoryInbox implements Inbox {
  private readonly store = new Map<string, InboxRecord>();
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private readonly logger?: Logger;

  constructor(options: InboxOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSize = options.maxSize ?? 100_000;
    this.logger = options.logger;
  }

  async accept(message: Message): Promise<Result<boolean, MessagingError>> {
    const now = Date.now();
    const existing = this.store.get(message.id);

    if (existing) {
      if (existing.expiresAt > now) {
        this.logger?.debug("inbox.duplicate", { id: message.id, kind: message.topic });
        return ok(false);
      }
      // Expired record — treat as new
      this.store.delete(message.id);
    }

    if (this.store.size >= this.maxSize) {
      return err(new MessagingError("INBOX_FULL", "Inbox capacity exceeded"));
    }

    const record: InboxRecord = {
      id: message.id,
      topic: message.topic,
      receivedAt: now,
      expiresAt: now + this.ttlMs,
    };

    this.store.set(message.id, record);
    this.logger?.debug("inbox.accepted", { id: message.id, kind: message.topic });
    return ok(true);
  }

  async has(id: string): Promise<Result<boolean, MessagingError>> {
    const record = this.store.get(id);
    if (!record) return ok(false);
    if (record.expiresAt <= Date.now()) {
      this.store.delete(id);
      return ok(false);
    }
    return ok(true);
  }

  async evictExpired(): Promise<Result<number, MessagingError>> {
    const now = Date.now();
    let count = 0;
    for (const [id, record] of this.store) {
      if (record.expiresAt <= now) {
        this.store.delete(id);
        count++;
      }
    }
    this.logger?.debug("inbox.evicted", { count });
    return ok(count);
  }

  get size(): number {
    return this.store.size;
  }
}
