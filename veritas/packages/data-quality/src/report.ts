// Quality report: aggregates check results into a structured per-dataset quality report.
import { z } from "zod";
import { newId } from "@veritas/core";
import { CheckResultSchema } from "./check.js";
import type { CheckResult } from "./check.js";
import type { QualityDimension, CheckSeverity } from "./types.js";

export const DimensionSummarySchema = z.object({
  dimension: z.string(),
  checkCount: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  score: z.number().min(0).max(1),
});
export type DimensionSummary = z.infer<typeof DimensionSummarySchema>;

export const QualityReportSchema = z.object({
  reportId: z.string(),
  datasetId: z.string(),
  generatedAt: z.string(),
  overallScore: z.number().min(0).max(1),
  totalChecks: z.number().int().nonnegative(),
  passedChecks: z.number().int().nonnegative(),
  failedChecks: z.number().int().nonnegative(),
  errorChecks: z.number().int().nonnegative(),
  criticalFailures: z.number().int().nonnegative(),
  dimensions: z.array(DimensionSummarySchema),
  checks: z.array(CheckResultSchema),
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

function groupByDimension(checks: readonly CheckResult[]): ReadonlyMap<string, CheckResult[]> {
  const map = new Map<string, CheckResult[]>();
  for (const c of checks) {
    const bucket = map.get(c.dimension) ?? [];
    bucket.push(c);
    map.set(c.dimension, bucket);
  }
  return map;
}

function dimensionScore(checks: readonly CheckResult[]): number {
  if (checks.length === 0) return 1;
  const relevant = checks.filter((c) => c.status !== "skipped" && c.status !== "error");
  if (relevant.length === 0) return 1;
  return relevant.reduce((s, c) => s + c.score, 0) / relevant.length;
}

function buildDimensionSummary(dimension: string, checks: readonly CheckResult[]): DimensionSummary {
  return {
    dimension,
    checkCount: checks.length,
    passedCount: checks.filter((c) => c.status === "passed").length,
    failedCount: checks.filter((c) => c.status === "failed").length,
    errorCount: checks.filter((c) => c.status === "error").length,
    score: dimensionScore(checks),
  };
}

export function buildQualityReport(datasetId: string, checks: readonly CheckResult[]): QualityReport {
  const byDimension = groupByDimension(checks);
  const dimensions = Array.from(byDimension.entries()).map(([dim, cs]) => buildDimensionSummary(dim, cs));

  const passedChecks = checks.filter((c) => c.status === "passed").length;
  const failedChecks = checks.filter((c) => c.status === "failed").length;
  const errorChecks = checks.filter((c) => c.status === "error").length;
  const criticalFailures = checks.filter((c) => c.status === "failed" && c.severity === "critical").length;

  const scoreable = checks.filter((c) => c.status !== "skipped" && c.status !== "error");
  const overallScore = scoreable.length === 0 ? 1 : scoreable.reduce((s, c) => s + c.score, 0) / scoreable.length;

  return QualityReportSchema.parse({
    reportId: newId("dq"),
    datasetId,
    generatedAt: new Date().toISOString(),
    overallScore,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    errorChecks,
    criticalFailures,
    dimensions,
    checks: checks as CheckResult[],
  });
}

export function filterByDimension(report: QualityReport, dimension: QualityDimension): readonly CheckResult[] {
  return report.checks.filter((c) => c.dimension === dimension);
}

export function filterBySeverity(report: QualityReport, severity: CheckSeverity): readonly CheckResult[] {
  return report.checks.filter((c) => c.severity === severity);
}

export function reportPassed(report: QualityReport): boolean {
  return report.criticalFailures === 0 && report.overallScore >= 0.8;
}
