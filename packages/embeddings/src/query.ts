// Semantic k-NN query: embeds a query string and retrieves the nearest neighbours.

import { ok, err, type Result } from "@veritas/core";
import type { Embedder } from "./embedder.js";
import type { VectorStore, KnnResult } from "./vector-store.js";
import { EmbeddingError } from "./errors.js";

export interface SemanticQueryOptions {
  readonly embedder: Embedder;
  readonly store: VectorStore;
  readonly k?: number;
  readonly filter?: Readonly<Record<string, unknown>>;
  readonly minScore?: number;
}

export interface QueryMatch {
  readonly id: string;
  readonly score: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Embeds `queryText` and returns the top-k nearest neighbours from the store. */
export async function semanticQuery(
  queryText: string,
  options: SemanticQueryOptions,
): Promise<Result<ReadonlyArray<QueryMatch>>> {
  const { embedder, store, k = 10, filter, minScore } = options;

  if (queryText.trim().length === 0) {
    return err(new EmbeddingError("Query text must not be blank"));
  }

  const embedResult = await embedder.embed(queryText);
  if (!embedResult.ok) {
    return err(new EmbeddingError("Failed to embed query text", { cause: embedResult.error }));
  }

  const knnResult = await store.query({ vector: embedResult.value, k, filter });
  if (!knnResult.ok) {
    return err(new EmbeddingError("Vector store query failed", { cause: knnResult.error }));
  }

  const matches = applyMinScore(knnResult.value, minScore);
  return ok(
    Object.freeze(
      matches.map((r) =>
        Object.freeze<QueryMatch>({
          id: r.record.id,
          score: r.score,
          metadata: r.record.metadata,
        }),
      ),
    ),
  );
}

/** Filters results below an optional minimum cosine score. */
function applyMinScore(
  results: ReadonlyArray<KnnResult>,
  minScore: number | undefined,
): ReadonlyArray<KnnResult> {
  if (minScore === undefined) return results;
  return results.filter((r) => r.score >= minScore);
}
