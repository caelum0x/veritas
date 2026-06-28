// In-memory cache of previously verified claims, keyed by content-hash fingerprint.

import type { ContentHash, Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { KnowledgeRecord } from "./knowledge-record.js";
import { recordHit } from "./knowledge-record.js";
import type { TtlPolicy } from "./ttl.js";
import { DEFAULT_TTL_POLICY, isFresh } from "./ttl.js";
import { KnowledgeNotFoundError, KnowledgeStaleError } from "./errors.js";

/** Port interface for the knowledge fact cache. */
export interface FactCache {
  get(fingerprint: ContentHash): Result<KnowledgeRecord, KnowledgeNotFoundError | KnowledgeStaleError>;
  set(record: KnowledgeRecord): void;
  delete(fingerprint: ContentHash): boolean;
  has(fingerprint: ContentHash): boolean;
  size(): number;
  clear(): void;
}

/** In-memory implementation of FactCache backed by a Map. */
export class InMemoryFactCache implements FactCache {
  private readonly store = new Map<ContentHash, KnowledgeRecord>();

  constructor(
    private readonly policy: TtlPolicy = DEFAULT_TTL_POLICY,
    private readonly nowMs: () => number = () => Date.now(),
  ) {}

  get(fingerprint: ContentHash): Result<KnowledgeRecord, KnowledgeNotFoundError | KnowledgeStaleError> {
    const record = this.store.get(fingerprint);
    if (record === undefined) {
      return err(new KnowledgeNotFoundError(fingerprint));
    }
    const now = this.nowMs();
    if (!isFresh(record.cachedAt, record.confidence, this.policy, now)) {
      this.store.delete(fingerprint);
      return err(new KnowledgeStaleError(fingerprint, record.cachedAt));
    }
    const updated = recordHit(record, now);
    this.store.set(fingerprint, updated);
    return ok(updated);
  }

  set(record: KnowledgeRecord): void {
    this.store.set(record.fingerprint, record);
  }

  delete(fingerprint: ContentHash): boolean {
    return this.store.delete(fingerprint);
  }

  has(fingerprint: ContentHash): boolean {
    const record = this.store.get(fingerprint);
    if (record === undefined) return false;
    return isFresh(record.cachedAt, record.confidence, this.policy, this.nowMs());
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
