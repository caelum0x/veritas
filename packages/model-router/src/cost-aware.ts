// Cost-aware routing strategy: selects the cheapest model satisfying task constraints
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { RoutingTask, RoutingDecision, RoutingStrategy } from "./types.js";
import type { ModelRegistry } from "./registry.js";
import type { ModelEntry } from "./registry.js";
import { resolveQualityTier, requiresWebSearch } from "./task-profile.js";
import { NoModelAvailableError } from "./errors.js";

/** Estimate USD cost for a candidate entry given token counts */
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
 * Cost-aware routing strategy.
 * Picks the lowest-cost model that meets quality tier and web-search constraints,
 * and optionally enforces a per-task budget cap.
 */
export class CostAwareStrategy implements RoutingStrategy {
  readonly name = "cost-aware";

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

    // Collect candidates matching tier (or better if budget allows)
    let candidates = this.registry.byTier(tier);

    // If web search is required, restrict to capable models
    if (needsWeb) {
      candidates = candidates.filter((e) => e.supportsWebSearch);
    }

    if (candidates.length === 0) {
      // Widen search to all tiers with web search if needed
      const allCandidates = needsWeb
        ? this.registry.withWebSearch()
        : this.registry.all();

      if (allCandidates.length === 0) {
        return err(
          new NoModelAvailableError({
            message: `No model available for task kind "${task.kind}" (tier: ${tier}, webSearch: ${needsWeb})`,
          }),
        );
      }
      candidates = allCandidates;
    }

    // Sort by ascending cost
    const sorted = [...candidates].sort((a, b) => {
      const costA = estimateCost(a, task.estimatedInputTokens, estimatedOutput);
      const costB = estimateCost(b, task.estimatedInputTokens, estimatedOutput);
      return costA - costB;
    });

    // Apply budget cap if set
    const budget = task.budgetUsd ?? 0;
    const affordable = budget > 0
      ? sorted.filter(
          (e) =>
            estimateCost(e, task.estimatedInputTokens, estimatedOutput) <=
            budget,
        )
      : sorted;

    const chosen = affordable[0] ?? sorted[0]; // fall back to cheapest even over budget
    if (!chosen) {
      return err(
        new NoModelAvailableError({
          message: "Model registry is empty",
        }),
      );
    }

    const cost = estimateCost(chosen, task.estimatedInputTokens, estimatedOutput);

    return ok({
      provider: chosen.provider,
      modelId: chosen.modelId,
      rationale: `Cost-aware selection: cheapest model in tier "${tier}" is "${chosen.modelId}" at ~$${cost.toFixed(6)} USD`,
      estimatedCostUsd: cost,
    });
  }
}
