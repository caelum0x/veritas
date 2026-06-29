// Item similarity — content and tag overlap scoring utilities.

import { cosineSimilarity } from "@veritas/embeddings";
import type { RecommendableItem } from "./item.js";

export interface SimilarityScore {
  readonly itemId: string;
  readonly score: number;
}

/** Cosine similarity between two items' embeddings; returns 0 if either lacks embedding. */
export function embeddingSimilarity(
  a: RecommendableItem,
  b: RecommendableItem
): number {
  if (!a.embedding || !b.embedding) return 0;
  return cosineSimilarity(a.embedding, b.embedding);
}

/** Jaccard similarity over tag sets. */
export function tagJaccard(a: RecommendableItem, b: RecommendableItem): number {
  const setA = new Set(a.tags);
  const setB = new Set(b.tags);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Blended similarity: weighted sum of embedding cosine + tag Jaccard. */
export function blendedSimilarity(
  a: RecommendableItem,
  b: RecommendableItem,
  embeddingWeight = 0.8,
  tagWeight = 0.2
): number {
  const eSim = embeddingSimilarity(a, b);
  const tSim = tagJaccard(a, b);
  return embeddingWeight * eSim + tagWeight * tSim;
}

/** Rank a list of candidates by similarity to a reference item, descending. */
export function rankBySimilarityToItem(
  reference: RecommendableItem,
  candidates: readonly RecommendableItem[],
  embeddingWeight = 0.8,
  tagWeight = 0.2
): SimilarityScore[] {
  return candidates
    .filter((c) => c.id !== reference.id)
    .map((c) => ({
      itemId: c.id,
      score: blendedSimilarity(reference, c, embeddingWeight, tagWeight),
    }))
    .sort((x, y) => y.score - x.score);
}
