// Quality-aware routing strategy: maximizes model quality within optional budget
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { RoutingTask, RoutingDecision, RoutingStrategy } from "./types.js";
import type { ModelRegistry } from "./registry.js";
import type { ModelEntry } from "./registry.js";
import { resolveQualityTier, requiresWebSearch } from "./task-profile.js";
import { NoModelAvailableError } from "./errors.js";

/** Map quality tiers to numeric rank for sorting (higher = better quality) */
const TIER_RANK: Readonly<Record<string, number>> = {
  economy: 1,
  balanced: 2,
  premium: 3,
};

/** Estimate USD cost for a candidate entry */
function estimateCost(
  entry: ModelEntry,
  inputTokens: number,
  outputTokens: number,
): number {
  const M = 1_000_000;
  return (
    (inputTokens / M) * entry.inputCostPerMillion +
    (outputTokens / M) * entry.outputCostPerMillion
  );
}

/**
 * Quality-aware routing strategy.
 * Selects the highest-quality model that meets web-search constraints and
 * respects an optional per-task budget cap.
 */
export class QualityAwareStrategy implements RoutingStrategy {
  readonly name = "quality-aware";

  constructor(
    private readonly registry: ModelRegistry,
    /** Assumed output/input token ratio for cost estimation */
    private readonly outputInputRatio = 0.25,
  ) {}

  select(task: RoutingTask): Result<RoutingDecision, AppError> {
    const tier = resolveQualityTier(task.kind, task.qualityTier);
    const needsWeb = requiresWebSearch(task.kind, task.requiresWebSearch);
    const estimatedOutput = Math.ceil(
      task.estimatedInputTokens * this.outputInputRatio,
    );
    const budget = task.budgetUsd ?? 0;

    // Start from the full registry; filter for web search if required
    let candidates: ReadonlyArray<ModelEntry> = needsWeb
      ? this.registry.withWebSearch()
      : this.registry.all();

    // Apply budget cap when set
    if (budget > 0) {
      candidates = candidates.filter(
        (e) =>
          estimateCost(e, task.estimatedInputTokens, estimatedOutput) <= budget,
      );
    }

    if (candidates.length === 0) {
      return err(
        new NoModelAvailableError({
          message: `No model satisfies quality+budget constraints for task "${task.kind}" (tier: ${tier}, budget: ${budget})`,
        }),
      );
    }

    // Sort by descending tier rank, then descending quality weight (output cost as proxy)
    const sorted = [...candidates].sort((a, b) => {
      const rankDiff =
        (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      return b.outputCostPerMillion - a.outputCostPerMillion;
    });

    // Prefer models at or above the requested tier; fall back to best available
    const atOrAbove = sorted.filter(
      (e) => (TIER_RANK[e.tier] ?? 0) >= (TIER_RANK[tier] ?? 0),
    );
    const chosen = atOrAbove[0] ?? sorted[0];

    if (!chosen) {
      return err(
        new NoModelAvailableError({ message: "Model registry is empty" }),
      );
    }

    const cost = estimateCost(chosen, task.estimatedInputTokens, estimatedOutput);

    return ok({
      provider: chosen.provider,
      modelId: chosen.modelId,
      rationale: `Quality-aware selection: best model for tier "${tier}" is "${chosen.modelId}" (tier: ${chosen.tier}) at ~$${cost.toFixed(6)} USD`,
      estimatedCostUsd: cost,
    });
  }
}
