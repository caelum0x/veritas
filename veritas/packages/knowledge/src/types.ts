// Shared auxiliary domain types for the @veritas/knowledge package.

import type { IsoTimestamp } from "@veritas/core";
import type { KnowledgeRecord } from "./knowledge-record.js";

export type { KnowledgeRecord };

/** A hit returned by a knowledge-base lookup. */
export interface KnowledgeLookupHit {
  readonly record: KnowledgeRecord;
  readonly similarity: number;
  readonly isFresh: boolean;
}

/** Result of a knowledge-base query operation. */
export interface KnowledgeQueryResult {
  readonly hits: ReadonlyArray<KnowledgeLookupHit>;
  readonly totalScanned: number;
  readonly durationMs: number;
}

/** Parameters for querying the knowledge store. */
export interface KnowledgeQueryParams {
  readonly claimText: string;
  readonly topK?: number;
  readonly minSimilarity?: number;
  readonly freshOnly?: boolean;
}

/** Snapshot of knowledge-store statistics. */
export interface KnowledgeStats {
  readonly totalRecords: number;
  readonly freshRecords: number;
  readonly staleRecords: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly invalidationCount: number;
  readonly oldestCachedAt: IsoTimestamp | undefined;
  readonly newestCachedAt: IsoTimestamp | undefined;
}
