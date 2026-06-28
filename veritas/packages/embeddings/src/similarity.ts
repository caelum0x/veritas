// Cosine and dot-product similarity functions for Vector pairs.

import { dot, magnitude } from "./vector.js";
import type { Vector } from "./vector.js";

/** Returns cosine similarity in [-1, 1]; throws on zero-magnitude input. */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    throw new RangeError("Cannot compute cosine similarity for a zero vector");
  }
  return dot(a, b) / (magA * magB);
}

/** Returns cosine distance in [0, 2]. */
export function cosineDistance(a: Vector, b: Vector): number {
  return 1 - cosineSimilarity(a, b);
}

/** Returns raw dot-product similarity (useful for pre-normalised vectors). */
export function dotSimilarity(a: Vector, b: Vector): number {
  return dot(a, b);
}

/** Ranks candidates by cosine similarity to query, descending. */
export function rankBySimilarity(
  query: Vector,
  candidates: ReadonlyArray<{ readonly id: string; readonly vector: Vector }>,
): ReadonlyArray<{ readonly id: string; readonly score: number }> {
  return [...candidates]
    .map(({ id, vector }) => ({ id, score: cosineSimilarity(query, vector) }))
    .sort((a, b) => b.score - a.score);
}
