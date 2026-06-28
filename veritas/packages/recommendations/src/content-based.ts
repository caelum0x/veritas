// Content-based recommendation — finds items similar to a user's seed items via embedding/tag similarity.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Recommender, RecommendRequest, RecommendResult, Recommendation } from "./recommender.js";
import type { RecommendableItem } from "./item.js";
import type { RecommendationError } from "./errors.js";
import { InsufficientDataError, ItemNotFoundError } from "./errors.js";
import { rankBySimilarityToItem } from "./similarity.js";

export interface ContentBasedOptions {
  readonly embeddingWeight: number;
  readonly tagWeight: number;
  readonly minSeedItems: number;
}

const DEFAULT_OPTIONS: ContentBasedOptions = {
  embeddingWeight: 0.8,
  tagWeight: 0.2,
  minSeedItems: 1,
};

/** Merge scores across multiple seed items by taking max per candidate. */
function mergeScores(
  scoreMaps: ReadonlyArray<ReadonlyArray<{ itemId: string; score: number }>>
): Map<string, number> {
  const merged = new Map<string, number>();
  for (const scores of scoreMaps) {
    for (const { itemId, score } of scores) {
      const existing = merged.get(itemId) ?? 0;
      if (score > existing) merged.set(itemId, score);
    }
  }
  return merged;
}

export class ContentBasedRecommender implements Recommender {
  readonly strategyName = "content-based";

  constructor(
    private readonly itemCatalog: ReadonlyMap<string, RecommendableItem>,
    private readonly options: ContentBasedOptions = DEFAULT_OPTIONS
  ) {}

  async recommend(
    request: RecommendRequest
  ): Promise<Result<RecommendResult, RecommendationError>> {
    const seedIds = request.seedItemIds ?? [];

    if (seedIds.length < this.options.minSeedItems) {
      return err(new InsufficientDataError("at least one seed item required"));
    }

    const seeds: RecommendableItem[] = [];
    for (const id of seedIds) {
      const item = this.itemCatalog.get(id);
      if (!item) return err(new ItemNotFoundError(id));
      seeds.push(item);
    }

    const allItems = [...this.itemCatalog.values()].filter((i) => {
      if (seedIds.includes(i.id)) return false;
      if (request.kind && i.kind !== request.kind) return false;
      return true;
    });

    if (allItems.length === 0) {
      return ok({ recommendations: [], strategy: this.strategyName });
    }

    const perSeed = seeds.map((seed) =>
      rankBySimilarityToItem(
        seed,
        allItems,
        this.options.embeddingWeight,
        this.options.tagWeight
      )
    );

    const merged = mergeScores(perSeed);
    const limit = request.limit ?? 20;

    const recommendations: Recommendation[] = [...merged.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([itemId, score]) => {
        const item = this.itemCatalog.get(itemId)!;
        return {
          item,
          score,
          reason: `similar to ${seeds.map((s) => s.title).join(", ")}`,
        };
      });

    return ok({ recommendations, strategy: this.strategyName });
  }
}
