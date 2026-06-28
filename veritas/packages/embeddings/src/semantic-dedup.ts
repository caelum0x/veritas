// Semantic deduplication: removes near-duplicate texts by cosine similarity threshold.

import { ok, err, type Result } from "@veritas/core";
import type { Embedder } from "./embedder.js";
import type { DedupRequest, DedupResult } from "./types.js";
import { cosineSimilarity } from "./similarity.js";

export interface DedupOptions {
  readonly embedder: Embedder;
}

/**
 * Embeds all texts and removes duplicates whose cosine similarity to an
 * already-accepted text exceeds the given threshold.
 * The first occurrence of each cluster is kept.
 */
export async function deduplicateTexts(
  request: DedupRequest,
  options: DedupOptions,
): Promise<Result<DedupResult>> {
  const { texts, threshold } = request;
  const { embedder } = options;

  if (texts.length === 0) {
    return ok({ unique: Object.freeze([]), duplicates: Object.freeze([]) });
  }

  const batchResult = await embedder.embedBatch(texts);
  if (!batchResult.ok) {
    return err(batchResult.error);
  }

  const vectors = batchResult.value;

  const uniqueIndices: number[] = [];
  const duplicates: DedupResult["duplicates"][number][] = [];

  for (let i = 0; i < texts.length; i++) {
    const vi = vectors[i]!;
    let isDuplicate = false;

    for (const j of uniqueIndices) {
      const vj = vectors[j]!;
      let score: number;
      try {
        score = cosineSimilarity(vi, vj);
      } catch {
        // Zero-vector edge case — treat as distinct
        continue;
      }

      if (score >= threshold) {
        duplicates.push(
          Object.freeze({
            original: texts[j]!,
            duplicate: texts[i]!,
            score,
          }),
        );
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueIndices.push(i);
    }
  }

  return ok(
    Object.freeze({
      unique: Object.freeze(uniqueIndices.map((i) => texts[i]!)),
      duplicates: Object.freeze(duplicates),
    }),
  );
}
