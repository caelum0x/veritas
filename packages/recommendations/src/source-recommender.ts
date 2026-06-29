// Recommend credible sources for a claim based on topic tags, trust tier, and embedding similarity.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RecommendableItem } from "./item.js";
import type { RecommendRequest, Recommendation, RecommendResult, Recommender } from "./recommender.js";
import type { RecommendationError } from "./errors.js";
import { InsufficientDataError } from "./errors.js";
import { rankBySimilarityToItem } from "./similarity.js";
import { rankCandidates } from "./ranking.js";

/** In-memory store of source items — swap for a real repository in production. */
export interface SourceCatalog {
  findAll(): Promise<readonly RecommendableItem[]>;
  findById(id: string): Promise<RecommendableItem | undefined>;
}

export class InMemorySourceCatalog implements SourceCatalog {
  private readonly items: Map<string, RecommendableItem>;

  constructor(items: readonly RecommendableItem[] = []) {
    this.items = new Map(items.map((i) => [i.id, i]));
  }

  async findAll(): Promise<readonly RecommendableItem[]> {
    return [...this.items.values()];
  }

  async findById(id: string): Promise<RecommendableItem | undefined> {
    return this.items.get(id);
  }

  withItem(item: RecommendableItem): InMemorySourceCatalog {
    return new InMemorySourceCatalog([...this.items.values(), item]);
  }
}

/** Derive a trust boost (0–1) from source metadata trust tier or explicit trustScore. */
function trustBoost(source: RecommendableItem): number {
  const score = source.metadata["trustScore"];
  if (typeof score === "number" && score >= 0 && score <= 1) return score;

  const tier = source.metadata["tier"];
  if (tier === "primary") return 1.0;
  if (tier === "secondary") return 0.75;
  if (tier === "tertiary") return 0.5;
  return 0.3;
}

export class SourceRecommender implements Recommender {
  readonly strategyName = "source-recommender";

  constructor(private readonly catalog: SourceCatalog) {}

  async recommend(
    request: RecommendRequest,
  ): Promise<Result<RecommendResult, RecommendationError>> {
    const sources = await this.catalog.findAll();
    if (sources.length === 0) {
      return err(new InsufficientDataError("source catalog is empty"));
    }

    const limit = request.limit ?? 10;
    const kindFilter = request.kind;

    const candidates = sources.filter(
      (s) => kindFilter === undefined || s.kind === kindFilter,
    );

    if (candidates.length === 0) {
      return err(new InsufficientDataError(`no sources match kind: ${kindFilter}`));
    }

    let recommendations: Recommendation[];

    if (request.seedItemIds && request.seedItemIds.length > 0) {
      const seeds = await Promise.all(
        request.seedItemIds.map((id) => this.catalog.findById(id)),
      );
      const validSeeds = seeds.filter((s): s is RecommendableItem => s !== undefined);

      if (validSeeds.length === 0) {
        return err(new InsufficientDataError("none of the seed items were found in the source catalog"));
      }

      const allSimilarities = validSeeds.flatMap((seed) =>
        rankBySimilarityToItem(seed, candidates),
      );

      const scoreMap = new Map<string, number>();
      for (const { itemId, score } of allSimilarities) {
        const current = scoreMap.get(itemId) ?? 0;
        if (score > current) scoreMap.set(itemId, score);
      }

      const ranked = rankCandidates(
        candidates.map((s) => ({
          itemId: s.id,
          rawScore: scoreMap.get(s.id) ?? 0,
          boostFactor: trustBoost(s),
          reason: "content similarity to seed items with trust boost",
        })),
        limit,
      );

      recommendations = ranked.map((r) => {
        const item = candidates.find((c) => c.id === r.itemId)!;
        return { item, score: r.finalScore, reason: r.reason };
      });
    } else {
      // Fall back to pure trust-tier ranking when no seeds provided.
      const ranked = rankCandidates(
        candidates.map((s) => ({
          itemId: s.id,
          rawScore: trustBoost(s),
          boostFactor: 1,
          reason: "source trust tier",
        })),
        limit,
      );

      recommendations = ranked.map((r) => {
        const item = candidates.find((c) => c.id === r.itemId)!;
        return { item, score: r.finalScore, reason: r.reason };
      });
    }

    return ok({ recommendations, strategy: this.strategyName });
  }
}
