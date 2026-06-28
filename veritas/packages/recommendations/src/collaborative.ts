// Collaborative filtering — user-based CF using interaction history.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Recommender, RecommendRequest, RecommendResult, Recommendation } from "./recommender.js";
import type { RecommendableItem } from "./item.js";
import type { RecommendationError } from "./errors.js";
import { InsufficientDataError, ItemNotFoundError } from "./errors.js";

export interface InteractionRecord {
  readonly principalId: string;
  readonly itemId: string;
  /** Positive weight (e.g. 1=view, 2=click, 5=accept, -2=reject). */
  readonly weight: number;
}

export interface CollaborativeOptions {
  readonly minNeighbors: number;
  readonly neighborhoodSize: number;
  readonly minInteractions: number;
}

const DEFAULT_OPTIONS: CollaborativeOptions = {
  minNeighbors: 2,
  neighborhoodSize: 10,
  minInteractions: 2,
};

/** Build a map: principalId -> itemId -> cumulative weight. */
function buildMatrix(
  records: readonly InteractionRecord[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();
  for (const r of records) {
    let row = matrix.get(r.principalId);
    if (!row) {
      row = new Map();
      matrix.set(r.principalId, row);
    }
    row.set(r.itemId, (row.get(r.itemId) ?? 0) + r.weight);
  }
  return matrix;
}

/** Pearson correlation between two weight vectors. */
function pearson(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  const commonItems = [...a.keys()].filter((k) => b.has(k));
  const n = commonItems.length;
  if (n === 0) return 0;

  const sumA = commonItems.reduce((s, k) => s + (a.get(k) ?? 0), 0);
  const sumB = commonItems.reduce((s, k) => s + (b.get(k) ?? 0), 0);
  const sumSqA = commonItems.reduce((s, k) => s + (a.get(k) ?? 0) ** 2, 0);
  const sumSqB = commonItems.reduce((s, k) => s + (b.get(k) ?? 0) ** 2, 0);
  const sumProd = commonItems.reduce(
    (s, k) => s + (a.get(k) ?? 0) * (b.get(k) ?? 0),
    0
  );

  const num = sumProd - (sumA * sumB) / n;
  const den = Math.sqrt(
    (sumSqA - sumA ** 2 / n) * (sumSqB - sumB ** 2 / n)
  );
  return den === 0 ? 0 : num / den;
}

export class CollaborativeFilteringRecommender implements Recommender {
  readonly strategyName = "collaborative-filtering";

  constructor(
    private readonly interactions: readonly InteractionRecord[],
    private readonly itemCatalog: ReadonlyMap<string, RecommendableItem>,
    private readonly options: CollaborativeOptions = DEFAULT_OPTIONS
  ) {}

  async recommend(
    request: RecommendRequest
  ): Promise<Result<RecommendResult, RecommendationError>> {
    const matrix = buildMatrix(this.interactions);
    const userRow = matrix.get(request.principalId);

    if (!userRow || userRow.size < this.options.minInteractions) {
      return err(new InsufficientDataError());
    }

    // Find similar neighbors.
    const neighbors: Array<{ id: string; sim: number }> = [];
    for (const [otherId, otherRow] of matrix) {
      if (otherId === request.principalId) continue;
      const sim = pearson(userRow, otherRow);
      if (sim > 0) neighbors.push({ id: otherId, sim });
    }

    neighbors.sort((x, y) => y.sim - x.sim);
    const topNeighbors = neighbors.slice(0, this.options.neighborhoodSize);

    if (topNeighbors.length < this.options.minNeighbors) {
      return err(new InsufficientDataError("too few similar users"));
    }

    // Weighted score per unseen item.
    const scores = new Map<string, number>();
    const simSum = new Map<string, number>();

    for (const { id: neighborId, sim } of topNeighbors) {
      const neighborRow = matrix.get(neighborId);
      if (!neighborRow) continue;
      for (const [itemId, weight] of neighborRow) {
        if (userRow.has(itemId)) continue; // already interacted
        scores.set(itemId, (scores.get(itemId) ?? 0) + sim * weight);
        simSum.set(itemId, (simSum.get(itemId) ?? 0) + Math.abs(sim));
      }
    }

    const limit = request.limit ?? 20;
    const candidates: Recommendation[] = [];

    for (const [itemId, rawScore] of scores) {
      const divisor = simSum.get(itemId) ?? 1;
      const normalizedScore = Math.min(1, Math.max(0, rawScore / divisor));
      const item = this.itemCatalog.get(itemId);
      if (!item) continue;
      if (request.kind && item.kind !== request.kind) continue;
      candidates.push({
        item,
        score: normalizedScore,
        reason: `recommended by ${topNeighbors.length} similar users`,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    return ok({
      recommendations: candidates.slice(0, limit),
      strategy: this.strategyName,
    });
  }
}
