// Cost optimizer: generates actionable optimization hints from cost summaries
import type { CostSummary } from "./aggregator.js";

export type OptimizationSeverity = "info" | "warning" | "critical";

export interface OptimizationHint {
  readonly id: string;
  readonly tenantId: string;
  readonly feature: string | undefined;
  readonly severity: OptimizationSeverity;
  readonly category: string;
  readonly message: string;
  readonly estimatedSavingsUsdc: number;
  readonly generatedAt: string;
}

export interface OptimizerConfig {
  readonly highSpendThresholdUsdc: number;
  readonly singleCategoryDominanceRatio: number;
  readonly rapidGrowthRatioThreshold: number;
}

const DEFAULT_CONFIG: OptimizerConfig = {
  highSpendThresholdUsdc: 100,
  singleCategoryDominanceRatio: 0.8,
  rapidGrowthRatioThreshold: 2.0,
};

export interface CostOptimizer {
  analyze(
    current: readonly CostSummary[],
    previous: readonly CostSummary[],
    config?: Partial<OptimizerConfig>
  ): OptimizationHint[];
}

function findSummary(
  summaries: readonly CostSummary[],
  tenantId: string,
  feature: string | undefined
): CostSummary | undefined {
  return summaries.find(
    (s) => s.tenantId === tenantId && s.feature === feature
  );
}

let hintCounter = 0;
function nextHintId(): string {
  hintCounter += 1;
  return `hint-${hintCounter}`;
}

export function createCostOptimizer(): CostOptimizer {
  function analyze(
    current: readonly CostSummary[],
    previous: readonly CostSummary[],
    configOverride: Partial<OptimizerConfig> = {}
  ): OptimizationHint[] {
    const config: OptimizerConfig = { ...DEFAULT_CONFIG, ...configOverride };
    const now = new Date().toISOString();
    const hints: OptimizationHint[] = [];

    for (const summary of current) {
      const prev = findSummary(previous, summary.tenantId, summary.feature);

      // High absolute spend
      if (summary.totalUsdc > config.highSpendThresholdUsdc) {
        hints.push({
          id: nextHintId(),
          tenantId: summary.tenantId,
          feature: summary.feature,
          severity: "warning",
          category: "high_spend",
          message: `Total spend of $${summary.totalUsdc.toFixed(2)} exceeds threshold of $${config.highSpendThresholdUsdc.toFixed(2)}. Review usage drivers.`,
          estimatedSavingsUsdc: summary.totalUsdc * 0.15,
          generatedAt: now,
        });
      }

      // Single-category dominance
      const categories = Object.entries(summary.breakdown);
      for (const [cat, amount] of categories) {
        const ratio = summary.totalUsdc > 0 ? amount / summary.totalUsdc : 0;
        if (ratio >= config.singleCategoryDominanceRatio) {
          hints.push({
            id: nextHintId(),
            tenantId: summary.tenantId,
            feature: summary.feature,
            severity: "info",
            category: "category_dominance",
            message: `Category "${cat}" accounts for ${(ratio * 100).toFixed(0)}% of spend. Consider optimizing this resource type.`,
            estimatedSavingsUsdc: amount * 0.1,
            generatedAt: now,
          });
        }
      }

      // Rapid growth
      if (prev !== undefined && prev.totalUsdc > 0) {
        const growthRatio = summary.totalUsdc / prev.totalUsdc;
        if (growthRatio >= config.rapidGrowthRatioThreshold) {
          hints.push({
            id: nextHintId(),
            tenantId: summary.tenantId,
            feature: summary.feature,
            severity: "critical",
            category: "rapid_growth",
            message: `Spend grew ${growthRatio.toFixed(1)}x versus prior period ($${prev.totalUsdc.toFixed(2)} → $${summary.totalUsdc.toFixed(2)}). Investigate anomalies.`,
            estimatedSavingsUsdc: summary.totalUsdc - prev.totalUsdc,
            generatedAt: now,
          });
        }
      }
    }

    return hints;
  }

  return { analyze };
}
