// Quality scorecard: weighted multi-dimension scoring and grade assignment for a dataset.
import { z } from "zod";
import type { QualityDimension } from "./types.js";
import type { QualityReport, DimensionSummary } from "./report.js";

export const DimensionWeightSchema = z.object({
  dimension: z.string(),
  weight: z.number().positive(),
});
export type DimensionWeight = z.infer<typeof DimensionWeightSchema>;

export const ScorecardGradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export type ScorecardGrade = z.infer<typeof ScorecardGradeSchema>;

export const DimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(1),
  weight: z.number(),
  weightedScore: z.number(),
  checkCount: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const QualityScorecardSchema = z.object({
  datasetId: z.string(),
  reportId: z.string(),
  computedAt: z.string(),
  weightedScore: z.number().min(0).max(1),
  grade: ScorecardGradeSchema,
  dimensions: z.array(DimensionScoreSchema),
  criticalFailures: z.number().int().nonnegative(),
  passed: z.boolean(),
});
export type QualityScorecard = z.infer<typeof QualityScorecardSchema>;

export const DEFAULT_WEIGHTS: ReadonlyArray<DimensionWeight> = [
  { dimension: "completeness", weight: 0.25 },
  { dimension: "validity", weight: 0.25 },
  { dimension: "uniqueness", weight: 0.15 },
  { dimension: "freshness", weight: 0.15 },
  { dimension: "accuracy", weight: 0.10 },
  { dimension: "consistency", weight: 0.05 },
  { dimension: "anomaly", weight: 0.05 },
];

function gradeFromScore(score: number): ScorecardGrade {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

function normalizeWeights(weights: ReadonlyArray<DimensionWeight>): ReadonlyMap<string, number> {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  return new Map(weights.map((w) => [w.dimension, w.weight / total]));
}

function buildDimensionScore(summary: DimensionSummary, weight: number): DimensionScore {
  return {
    dimension: summary.dimension,
    score: summary.score,
    weight,
    weightedScore: summary.score * weight,
    checkCount: summary.checkCount,
    passedCount: summary.passedCount,
    failedCount: summary.failedCount,
  };
}

export function computeScorecard(
  report: QualityReport,
  weights: ReadonlyArray<DimensionWeight> = DEFAULT_WEIGHTS
): QualityScorecard {
  const normalizedWeights = normalizeWeights(weights);

  const dimensionScores: DimensionScore[] = report.dimensions.map((summary) => {
    const weight = normalizedWeights.get(summary.dimension) ?? 0;
    return buildDimensionScore(summary, weight);
  });

  // Add zero-scored entries for dimensions with weights but no checks
  const coveredDimensions = new Set(report.dimensions.map((d) => d.dimension));
  for (const [dimension, weight] of normalizedWeights) {
    if (!coveredDimensions.has(dimension)) {
      dimensionScores.push({
        dimension,
        score: 1,
        weight,
        weightedScore: weight,
        checkCount: 0,
        passedCount: 0,
        failedCount: 0,
      });
    }
  }

  const weightedScore = dimensionScores.reduce((s, d) => s + d.weightedScore, 0);
  const grade = gradeFromScore(weightedScore);
  const passed = grade !== "F" && report.criticalFailures === 0;

  return QualityScorecardSchema.parse({
    datasetId: report.datasetId,
    reportId: report.reportId,
    computedAt: new Date().toISOString(),
    weightedScore,
    grade,
    dimensions: dimensionScores,
    criticalFailures: report.criticalFailures,
    passed,
  });
}

export function getDimensionScore(scorecard: QualityScorecard, dimension: QualityDimension): DimensionScore | undefined {
  return scorecard.dimensions.find((d) => d.dimension === dimension);
}
