// Knowledge store: persists KnowledgeRecord entries and exposes CRUD + semantic search.

import type { ContentHash, Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { KnowledgeRecord } from "./knowledge-record.js";
import type { FactCache } from "./fact-cache.js";
import { InMemoryFactCache } from "./fact-cache.js";
import type { TtlPolicy } from "./ttl.js";
import { DEFAULT_TTL_POLICY, isFresh } from "./ttl.js";
import { KnowledgeNotFoundError, StoreCapacityError } from "./errors.js";

/** Port interface for the knowledge store backing the fact cache. */
export interface KnowledgeStore {
  get(fingerprint: ContentHash): Result<KnowledgeRecord, KnowledgeNotFoundError>;
  put(record: KnowledgeRecord): Result<void, StoreCapacityError>;
  remove(fingerprint: ContentHash): boolean;
  list(): ReadonlyArray<KnowledgeRecord>;
  size(): number;
  clear(): void;
}

/** Options for creating an in-memory knowledge store. */
export interface InMemoryKnowledgeStoreOptions {
  readonly ttlPolicy?: TtlPolicy;
  readonly maxCapacity?: number;
  readonly nowMs?: () => number;
}

/** In-memory implementation of KnowledgeStore backed by an InMemoryFactCache. */
export class InMemoryKnowledgeStore implements KnowledgeStore {
  private readonly cache: FactCache;
  private readonly records = new Map<ContentHash, KnowledgeRecord>();
  private readonly ttlPolicy: TtlPolicy;
  private readonly maxCapacity: number;
  private readonly nowMs: () => number;

  constructor(opts: InMemoryKnowledgeStoreOptions = {}) {
    this.ttlPolicy = opts.ttlPolicy ?? DEFAULT_TTL_POLICY;
    this.maxCapacity = opts.maxCapacity ?? 10_000;
    this.nowMs = opts.nowMs ?? (() => Date.now());
    this.cache = new InMemoryFactCache(this.ttlPolicy, this.nowMs);
  }

  get(fingerprint: ContentHash): Result<KnowledgeRecord, KnowledgeNotFoundError> {
    const cacheResult = this.cache.get(fingerprint);
    if (cacheResult.ok) return ok(cacheResult.value);
    const record = this.records.get(fingerprint);
    if (record === undefined) {
      return err(new KnowledgeNotFoundError(String(fingerprint)));
    }
    return ok(record);
  }

  put(record: KnowledgeRecord): Result<void, StoreCapacityError> {
    if (!this.records.has(record.fingerprint) && this.records.size >= this.maxCapacity) {
      return err(new StoreCapacityError(this.maxCapacity));
    }
    this.records.set(record.fingerprint, record);
    this.cache.set(record);
    return ok(undefined);
  }

  remove(fingerprint: ContentHash): boolean {
    const deleted = this.records.delete(fingerprint);
    this.cache.delete(fingerprint);
    return deleted;
  }

  list(): ReadonlyArray<KnowledgeRecord> {
    return Array.from(this.records.values());
  }

  size(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
    this.cache.clear();
  }

  /** Returns all records that are currently within their TTL window. */
  listFresh(): ReadonlyArray<KnowledgeRecord> {
    const nowMs = this.nowMs();
    return Array.from(this.records.values()).filter((r) =>
      isFresh(r.cachedAt, r.confidence, this.ttlPolicy, nowMs),
    );
  }
}
