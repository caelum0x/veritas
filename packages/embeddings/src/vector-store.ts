// Port interface for vector storage and nearest-neighbour retrieval.

import type { Vector } from "./vector.js";
import type { Result } from "@veritas/core";

export interface VectorRecord {
  readonly id: string;
  readonly vector: Vector;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface KnnQuery {
  readonly vector: Vector;
  readonly k: number;
  readonly filter?: Readonly<Record<string, unknown>>;
}

export interface KnnResult {
  readonly record: VectorRecord;
  readonly score: number;
}

export interface VectorStore {
  upsert(record: VectorRecord): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  get(id: string): Promise<Result<VectorRecord | undefined>>;
  query(query: KnnQuery): Promise<Result<ReadonlyArray<KnnResult>>>;
  count(): Promise<Result<number>>;
  clear(): Promise<Result<void>>;
}
