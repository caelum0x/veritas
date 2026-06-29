// In-memory VectorStore implementation using brute-force cosine similarity.

import { ok, err, type Result } from "@veritas/core";
import type { VectorStore, VectorRecord, KnnQuery, KnnResult } from "./vector-store.js";
import { cosineSimilarity } from "./similarity.js";

export class MemoryVectorStore implements VectorStore {
  private readonly records = new Map<string, VectorRecord>();

  async upsert(record: VectorRecord): Promise<Result<void>> {
    try {
      this.records.set(record.id, Object.freeze({ ...record }));
      return ok(undefined);
    } catch (e) {
      return err(e);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    this.records.delete(id);
    return ok(undefined);
  }

  async get(id: string): Promise<Result<VectorRecord | undefined>> {
    return ok(this.records.get(id));
  }

  async query(query: KnnQuery): Promise<Result<ReadonlyArray<KnnResult>>> {
    try {
      const { vector, k, filter } = query;
      const candidates: KnnResult[] = [];

      for (const record of this.records.values()) {
        if (filter && !matchesFilter(record.metadata, filter)) continue;
        const score = cosineSimilarity(record.vector, vector);
        candidates.push({ record, score });
      }

      candidates.sort((a, b) => b.score - a.score);
      return ok(Object.freeze(candidates.slice(0, k)));
    } catch (e) {
      return err(e);
    }
  }

  async count(): Promise<Result<number>> {
    return ok(this.records.size);
  }

  async clear(): Promise<Result<void>> {
    this.records.clear();
    return ok(undefined);
  }
}

function matchesFilter(
  metadata: Readonly<Record<string, unknown>>,
  filter: Readonly<Record<string, unknown>>,
): boolean {
  return Object.entries(filter).every(([k, v]) => metadata[k] === v);
}
