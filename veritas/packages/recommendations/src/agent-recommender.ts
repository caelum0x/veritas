// Recommend verifier agents for a claim based on tags, specialisation metadata, and past performance.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RecommendableItem } from "./item.js";
import type { RecommendRequest, Recommendation, RecommendResult, Recommender } from "./recommender.js";
import type { RecommendationError } from "./errors.js";
import { InsufficientDataError } from "./errors.js";
import { rankBySimilarityToItem } from "./similarity.js";
import { rankCandidates } from "./ranking.js";

/** In-memory store of agent items — swap for a real repository in production. */
export interface AgentCatalog {
  findAll(): Promise<readonly RecommendableItem[]>;
  findById(id: string): Promise<RecommendableItem | undefined>;
}

export class InMemoryAgentCatalog implements AgentCatalog {
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

  withItem(item: RecommendableItem): InMemoryAgentCatalog {
    return new InMemoryAgentCatalog([...this.items.values(), item]);
  }
}

/** Score from prior performance stored in agent metadata (0–1 float). */
function performanceScore(agent: RecommendableItem): number {
  const raw = agent.metadata["performanceScore"];
  if (typeof raw === "number" && raw >= 0 && raw <= 1) return raw;
  return 0.5;
}

export class AgentRecommender implements Recommender {
  readonly strategyName = "agent-recommender";

  constructor(private readonly catalog: AgentCatalog) {}

  async recommend(
    request: RecommendRequest,
  ): Promise<Result<RecommendResult, RecommendationError>> {
    const agents = await this.catalog.findAll();
    if (agents.length === 0) {
      return err(new InsufficientDataError("agent catalog is empty"));
    }

    const limit = request.limit ?? 10;
    const kindFilter = request.kind;

    const candidates = agents.filter(
      (a) => kindFilter === undefined || a.kind === kindFilter,
    );

    if (candidates.length === 0) {
      return err(new InsufficientDataError(`no agents match kind: ${kindFilter}`));
    }

    // If seed items provided, use similarity; otherwise fall back to performance score.
    let recommendations: Recommendation[];

    if (request.seedItemIds && request.seedItemIds.length > 0) {
      const seeds = await Promise.all(
        request.seedItemIds.map((id) => this.catalog.findById(id)),
      );
      const validSeeds = seeds.filter((s): s is RecommendableItem => s !== undefined);

      if (validSeeds.length === 0) {
        return err(new InsufficientDataError("none of the seed items were found in the agent catalog"));
      }

      const allSimilarities = validSeeds.flatMap((seed) =>
        rankBySimilarityToItem(seed, candidates),
      );

      // Aggregate by itemId: take maximum similarity score per candidate.
      const scoreMap = new Map<string, number>();
      for (const { itemId, score } of allSimilarities) {
        const current = scoreMap.get(itemId) ?? 0;
        if (score > current) scoreMap.set(itemId, score);
      }

      const ranked = rankCandidates(
        candidates.map((a) => ({
          itemId: a.id,
          rawScore: scoreMap.get(a.id) ?? 0,
          boostFactor: performanceScore(a),
          reason: "content similarity to seed items",
        })),
        limit,
      );

      recommendations = ranked.map((r) => {
        const item = candidates.find((c) => c.id === r.itemId)!;
        return { item, score: r.finalScore, reason: r.reason };
      });
    } else {
      const ranked = rankCandidates(
        candidates.map((a) => ({
          itemId: a.id,
          rawScore: performanceScore(a),
          boostFactor: 1,
          reason: "agent performance score",
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
