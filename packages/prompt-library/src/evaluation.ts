// Prompt evaluation metadata — schemas and helpers for tracking prompt quality over time.
import { z } from "zod";

/** Scoring dimensions used to grade a prompt's output. */
export const EvalDimensionSchema = z.enum([
  "accuracy",
  "completeness",
  "format_compliance",
  "reasoning_quality",
  "citation_coverage",
  "hallucination_rate",
  "latency_ms",
]);
export type EvalDimension = z.infer<typeof EvalDimensionSchema>;

/** A single scored dimension for one prompt run. */
export const DimensionScoreSchema = z.object({
  dimension: EvalDimensionSchema,
  score: z.number().min(0).max(1),
  notes: z.string().default(""),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

/** Full evaluation result for a prompt run. */
export const PromptEvalResultSchema = z.object({
  promptId: z.string().min(1),
  promptVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  runId: z.string().min(1),
  modelId: z.string().min(1),
  inputHash: z.string().min(1),
  scores: z.array(DimensionScoreSchema).min(1),
  aggregateScore: z.number().min(0).max(1),
  pass: z.boolean(),
  failReasons: z.array(z.string()).default([]),
  durationMs: z.number().nonnegative(),
  evaluatedAt: z.string().datetime(),
});
export type PromptEvalResult = z.infer<typeof PromptEvalResultSchema>;

/** Threshold configuration determining when a prompt eval passes. */
export const EvalThresholdsSchema = z.object({
  minAggregateScore: z.number().min(0).max(1).default(0.75),
  requiredDimensions: z.array(EvalDimensionSchema).default([]),
  dimensionMinimums: z.record(EvalDimensionSchema, z.number().min(0).max(1)).default({}),
});
export type EvalThresholds = z.infer<typeof EvalThresholdsSchema>;

/** Aggregate statistics across multiple eval runs for a single prompt version. */
export const PromptEvalSummarySchema = z.object({
  promptId: z.string().min(1),
  promptVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  totalRuns: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  meanAggregateScore: z.number().min(0).max(1),
  dimensionMeans: z.record(z.string(), z.number().min(0).max(1)),
  p50LatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  lastEvaluatedAt: z.string().datetime(),
});
export type PromptEvalSummary = z.infer<typeof PromptEvalSummarySchema>;

/**
 * Compute aggregate score as a weighted mean across dimension scores.
 * Weights default to equal if not provided.
 */
export function computeAggregateScore(
  scores: ReadonlyArray<DimensionScore>,
  weights: Partial<Record<EvalDimension, number>> = {}
): number {
  if (scores.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const ds of scores) {
    const w = weights[ds.dimension] ?? 1;
    weightedSum += ds.score * w;
    totalWeight += w;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Determine whether an eval result passes given thresholds.
 * Returns a list of failure reasons (empty = pass).
 */
export function evaluateThresholds(
  scores: ReadonlyArray<DimensionScore>,
  aggregateScore: number,
  thresholds: EvalThresholds
): string[] {
  const reasons: string[] = [];

  if (aggregateScore < thresholds.minAggregateScore) {
    reasons.push(
      `Aggregate score ${aggregateScore.toFixed(3)} below minimum ${thresholds.minAggregateScore}`
    );
  }

  const scoreByDimension = new Map<EvalDimension, number>(
    scores.map((s) => [s.dimension, s.score])
  );

  for (const dim of thresholds.requiredDimensions) {
    if (!scoreByDimension.has(dim)) {
      reasons.push(`Required dimension "${dim}" is missing from scores`);
    }
  }

  for (const [dim, minScore] of Object.entries(thresholds.dimensionMinimums)) {
    const actual = scoreByDimension.get(dim as EvalDimension);
    if (actual === undefined) {
      reasons.push(`Dimension "${dim}" required by minimum not found in scores`);
    } else if (actual < (minScore as number)) {
      reasons.push(
        `Dimension "${dim}" score ${actual.toFixed(3)} below minimum ${(minScore as number).toFixed(3)}`
      );
    }
  }

  return reasons;
}

/**
 * Build an eval summary from a list of completed eval results for one prompt version.
 */
export function summarizeEvalResults(
  results: ReadonlyArray<PromptEvalResult>
): PromptEvalSummary | null {
  if (results.length === 0) return null;

  const first = results[0]!;
  const { promptId, promptVersion } = first;

  const passCount = results.filter((r) => r.pass).length;
  const passRate = passCount / results.length;
  const meanAggregateScore =
    results.reduce((sum, r) => sum + r.aggregateScore, 0) / results.length;

  const dimensionAccumulators = new Map<string, number[]>();
  for (const r of results) {
    for (const ds of r.scores) {
      const arr = dimensionAccumulators.get(ds.dimension) ?? [];
      arr.push(ds.score);
      dimensionAccumulators.set(ds.dimension, arr);
    }
  }

  const dimensionMeans: Record<string, number> = {};
  for (const [dim, vals] of dimensionAccumulators) {
    dimensionMeans[dim] =
      vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const p50Idx = Math.floor(latencies.length * 0.5);
  const p95Idx = Math.floor(latencies.length * 0.95);
  const p50LatencyMs = latencies[p50Idx] ?? 0;
  const p95LatencyMs = latencies[p95Idx] ?? 0;

  const lastEvaluatedAt = results
    .map((r) => r.evaluatedAt)
    .sort()
    .at(-1)!;

  return {
    promptId,
    promptVersion,
    totalRuns: results.length,
    passRate,
    meanAggregateScore,
    dimensionMeans,
    p50LatencyMs,
    p95LatencyMs,
    lastEvaluatedAt,
  };
}
