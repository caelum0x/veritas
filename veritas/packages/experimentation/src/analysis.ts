// Aggregate experiment metrics and produce per-variant significance analysis
import { z } from "zod";
import { testProportions, testMeans, type SignificanceResult } from "./significance.js";
import type { ExperimentMetric } from "./types.js";

export const VariantStatsSchema = z.object({
  variantId: z.string(),
  observations: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  totalValue: z.number(),
  mean: z.number(),
  variance: z.number(),
});

export type VariantStats = z.infer<typeof VariantStatsSchema>;

export const VariantAnalysisSchema = z.object({
  variantId: z.string(),
  isControl: z.boolean(),
  stats: VariantStatsSchema,
  significance: z
    .object({
      significant: z.boolean(),
      pValue: z.number(),
      zScore: z.number(),
      confidenceLevel: z.number(),
      relativeUplift: z.number(),
    })
    .nullable(),
});

export type VariantAnalysis = z.infer<typeof VariantAnalysisSchema>;

export const ExperimentAnalysisSchema = z.object({
  experimentId: z.string(),
  metricId: z.string(),
  confidenceLevel: z.number(),
  variants: z.array(VariantAnalysisSchema),
  analysedAt: z.string(),
});

export type ExperimentAnalysis = z.infer<typeof ExperimentAnalysisSchema>;

/** Welford online algorithm accumulator for streaming variance */
export interface WelfordAccumulator {
  readonly n: number;
  readonly mean: number;
  readonly m2: number;
}

export const emptyWelford: WelfordAccumulator = { n: 0, mean: 0, m2: 0 };

export function welfordAdd(
  acc: WelfordAccumulator,
  value: number
): WelfordAccumulator {
  const n = acc.n + 1;
  const delta = value - acc.mean;
  const mean = acc.mean + delta / n;
  const delta2 = value - mean;
  const m2 = acc.m2 + delta * delta2;
  return { n, mean, m2 };
}

export function welfordVariance(acc: WelfordAccumulator): number {
  return acc.n < 2 ? 0 : acc.m2 / (acc.n - 1);
}

/** Produce significance analysis for a single metric across all variants */
export function analyseExperiment(
  experimentId: string,
  metric: ExperimentMetric,
  variantStats: readonly VariantStats[],
  controlVariantId: string,
  confidenceLevel = 0.95
): ExperimentAnalysis {
  const control = variantStats.find((v) => v.variantId === controlVariantId);
  const isProportion = metric.kind === "proportion";

  const variants: VariantAnalysis[] = variantStats.map((stats) => {
    const isControl = stats.variantId === controlVariantId;
    let significance: SignificanceResult | null = null;

    if (!isControl && control !== undefined) {
      if (isProportion) {
        significance = testProportions(
          {
            conversions: control.conversions,
            observations: Math.max(control.observations, 1),
          },
          {
            conversions: stats.conversions,
            observations: Math.max(stats.observations, 1),
          },
          confidenceLevel
        );
      } else {
        significance = testMeans(
          control.mean,
          control.variance,
          Math.max(control.observations, 1),
          stats.mean,
          stats.variance,
          Math.max(stats.observations, 1),
          confidenceLevel
        );
      }
    }

    return { variantId: stats.variantId, isControl, stats, significance };
  });

  return {
    experimentId,
    metricId: metric.id,
    confidenceLevel,
    variants,
    analysedAt: new Date().toISOString(),
  };
}
