// Payment idempotency: cache-and-replay mutating operations by idempotency key.

import { type Result, ok, err, InternalError, asIsoTimestamp } from "@veritas/core";
import { contentHash, newId } from "@veritas/core";
import type { IdempotencyKey, IdempotencyKeyStatus } from "@veritas/contracts";

/** Minimal in-memory store for idempotency records. */
interface IdempotencyStore {
  findByKey(key: string): Promise<IdempotencyKey | undefined>;
  save(record: IdempotencyKey): Promise<void>;
  update(id: string, patch: Partial<IdempotencyKey>): Promise<void>;
}

/** Shape of a captured HTTP-style response. */
export interface CapturedResponse {
  readonly status: number;
  readonly body: unknown;
}

/** Options passed when acquiring an idempotency slot. */
export interface AcquireOptions {
  readonly key: string;
  readonly organizationId: string | null;
  readonly method: string;
  readonly path: string;
  readonly requestBody: unknown;
  readonly ttlSeconds?: number;
}

const DEFAULT_TTL_SECONDS = 86_400; // 24 h

/** Build an ISO expiry timestamp from now + ttlSeconds. */
function expiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1_000).toISOString();
}

/** Fingerprint a request body for replay-safety checks. */
function hashBody(body: unknown): string {
  return contentHash(body);
}

/** Outcome returned by acquire(); tells the caller whether to execute or replay. */
export type AcquireOutcome =
  | { readonly kind: "replay"; readonly response: CapturedResponse }
  | { readonly kind: "proceed"; readonly recordId: string };

/**
 * Idempotency guard: acquire a slot, execute once, then store the result so
 * duplicate requests are safely replayed.
 */
export class PaymentIdempotency {
  constructor(private readonly store: IdempotencyStore) {}

  /**
   * Acquire an idempotency slot for the given key.
   * Returns "replay" with the cached response when the key was already seen,
   * or "proceed" with a record ID the caller must pass to complete()/fail().
   */
  async acquire(opts: AcquireOptions): Promise<Result<AcquireOutcome>> {
    try {
      const existing = await this.store.findByKey(opts.key);
      const reqHash = hashBody(opts.requestBody) as ReturnType<typeof contentHash>;

      if (existing !== undefined) {
        if (existing.status === "COMPLETED" && existing.responseBody !== null) {
          return ok({
            kind: "replay",
            response: {
              status: existing.responseStatus ?? 200,
              body: existing.responseBody,
            },
          });
        }
        if (existing.status === "IN_PROGRESS") {
          return err(new InternalError({ message: "Request is already in progress" }));
        }
        if (existing.status === "FAILED") {
          return err(new InternalError({ message: "Previous attempt failed; use a new idempotency key" }));
        }
      }

      const now = asIsoTimestamp(new Date().toISOString());
      const recordId = newId("idm");
      const record: IdempotencyKey = {
        id: recordId as IdempotencyKey["id"],
        key: opts.key,
        organizationId: (opts.organizationId ?? null) as IdempotencyKey["organizationId"],
        method: opts.method,
        path: opts.path,
        requestHash: reqHash,
        status: "IN_PROGRESS" as IdempotencyKeyStatus,
        responseStatus: null,
        responseBody: null,
        expiresAt: expiresAt(opts.ttlSeconds ?? DEFAULT_TTL_SECONDS),
        createdAt: now,
        updatedAt: now,
      };
      await this.store.save(record);
      return ok({ kind: "proceed", recordId: recordId as string });
    } catch (e) {
      return err(new InternalError({ message: "Idempotency store error", cause: e }));
    }
  }

  /** Mark the idempotency record as completed and store the response. */
  async complete(recordId: string, response: CapturedResponse): Promise<Result<void>> {
    try {
      await this.store.update(recordId, {
        status: "COMPLETED",
        responseStatus: response.status,
        responseBody: response.body,
        updatedAt: asIsoTimestamp(new Date().toISOString()),
      });
      return ok(undefined);
    } catch (e) {
      return err(new InternalError({ message: "Failed to complete idempotency record", cause: e }));
    }
  }

  /** Mark the idempotency record as failed. */
  async fail(recordId: string): Promise<Result<void>> {
    try {
      await this.store.update(recordId, {
        status: "FAILED",
        updatedAt: asIsoTimestamp(new Date().toISOString()),
      });
      return ok(undefined);
    } catch (e) {
      return err(new InternalError({ message: "Failed to fail idempotency record", cause: e }));
    }
  }
}

/** In-memory IdempotencyStore for development and testing. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records: Map<string, IdempotencyKey> = new Map();

  async findByKey(key: string): Promise<IdempotencyKey | undefined> {
    for (const record of this.records.values()) {
      if (record.key === key) return record;
    }
    return undefined;
  }

  async save(record: IdempotencyKey): Promise<void> {
    this.records.set(record.id as string, record);
  }

  async update(id: string, patch: Partial<IdempotencyKey>): Promise<void> {
    const existing = this.records.get(id);
    if (existing === undefined) throw new Error(`Idempotency record not found: ${id}`);
    this.records.set(id, { ...existing, ...patch });
  }
}
