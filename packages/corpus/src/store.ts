// Corpus store: port interface and in-memory implementation for corpus persistence.

import { ok, err, type Result, NotFoundError, ConflictError } from "@veritas/core";
import { type Corpus } from "./corpus.js";
import { type CorpusRecord } from "./record.js";
import { type CorpusSnapshot } from "./snapshot.js";
import { type CorpusFilter } from "./types.js";
import { CorpusNotFoundError, CorpusRecordNotFoundError, SnapshotNotFoundError, CorpusConflictError } from "./errors.js";

export interface CorpusPage {
  readonly items: readonly CorpusRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/** Persistence port for corpus management. */
export interface CorpusStore {
  getCorpus(id: string): Promise<Result<Corpus>>;
  listCorpora(ownerOrgId?: string): Promise<readonly Corpus[]>;
  saveCorpus(corpus: Corpus): Promise<Result<Corpus>>;
  deleteCorpus(id: string): Promise<Result<void>>;

  getRecord(id: string): Promise<Result<CorpusRecord>>;
  listRecords(filter: CorpusFilter, offset: number, limit: number): Promise<CorpusPage>;
  saveRecord(record: CorpusRecord): Promise<Result<CorpusRecord>>;
  deleteRecord(id: string): Promise<Result<void>>;

  getSnapshot(id: string): Promise<Result<CorpusSnapshot>>;
  listSnapshots(corpusId: string): Promise<readonly CorpusSnapshot[]>;
  saveSnapshot(snapshot: CorpusSnapshot): Promise<Result<CorpusSnapshot>>;
}

function matchesFilter(record: CorpusRecord, filter: CorpusFilter): boolean {
  if (filter.corpusId && record.corpusId !== filter.corpusId) return false;
  if (filter.domain && record.source.domain !== filter.domain) return false;
  if (filter.curatedBy && record.curatedBy !== filter.curatedBy) return false;
  if (filter.minAuthorityWeight !== undefined && record.authorityWeight < filter.minAuthorityWeight) return false;
  if (filter.minQualityScore !== undefined && record.qualityScore < filter.minQualityScore) return false;
  if (filter.tags && filter.tags.length > 0) {
    const rTags = new Set(record.tags);
    if (!filter.tags.every((t) => rTags.has(t))) return false;
  }
  if (filter.createdAfter && record.createdAt < filter.createdAfter) return false;
  if (filter.createdBefore && record.createdAt > filter.createdBefore) return false;
  return true;
}

/** In-memory CorpusStore for development and testing. */
export class InMemoryCorpusStore implements CorpusStore {
  private readonly corpora = new Map<string, Corpus>();
  private readonly records = new Map<string, CorpusRecord>();
  private readonly snapshots = new Map<string, CorpusSnapshot>();

  async getCorpus(id: string): Promise<Result<Corpus>> {
    const corpus = this.corpora.get(id);
    if (corpus === undefined) {
      return err(new CorpusNotFoundError(id));
    }
    return ok(corpus);
  }

  async listCorpora(ownerOrgId?: string): Promise<readonly Corpus[]> {
    const all = [...this.corpora.values()];
    if (ownerOrgId === undefined) return all;
    return all.filter((c) => c.ownerOrgId === ownerOrgId || c.isPublic);
  }

  async saveCorpus(corpus: Corpus): Promise<Result<Corpus>> {
    const existing = [...this.corpora.values()].find(
      (c) => c.name === corpus.name && c.id !== corpus.id,
    );
    if (existing !== undefined) {
      return err(new CorpusConflictError(corpus.name));
    }
    this.corpora.set(corpus.id, corpus);
    return ok(corpus);
  }

  async deleteCorpus(id: string): Promise<Result<void>> {
    if (!this.corpora.has(id)) {
      return err(new CorpusNotFoundError(id));
    }
    this.corpora.delete(id);
    return ok(undefined);
  }

  async getRecord(id: string): Promise<Result<CorpusRecord>> {
    const record = this.records.get(id);
    if (record === undefined) {
      return err(new CorpusRecordNotFoundError(id));
    }
    return ok(record);
  }

  async listRecords(
    filter: CorpusFilter,
    offset: number,
    limit: number,
  ): Promise<CorpusPage> {
    const all = [...this.records.values()].filter((r) => matchesFilter(r, filter));
    const total = all.length;
    const items = all.slice(offset, offset + limit);
    return { items, total, offset, limit };
  }

  async saveRecord(record: CorpusRecord): Promise<Result<CorpusRecord>> {
    this.records.set(record.id, record);
    return ok(record);
  }

  async deleteRecord(id: string): Promise<Result<void>> {
    if (!this.records.has(id)) {
      return err(new CorpusRecordNotFoundError(id));
    }
    this.records.delete(id);
    return ok(undefined);
  }

  async getSnapshot(id: string): Promise<Result<CorpusSnapshot>> {
    const snapshot = this.snapshots.get(id);
    if (snapshot === undefined) {
      return err(new SnapshotNotFoundError(id));
    }
    return ok(snapshot);
  }

  async listSnapshots(corpusId: string): Promise<readonly CorpusSnapshot[]> {
    return [...this.snapshots.values()]
      .filter((s) => s.corpusId === corpusId)
      .sort((a, b) => b.version - a.version);
  }

  async saveSnapshot(snapshot: CorpusSnapshot): Promise<Result<CorpusSnapshot>> {
    this.snapshots.set(snapshot.id, snapshot);
    return ok(snapshot);
  }
}
