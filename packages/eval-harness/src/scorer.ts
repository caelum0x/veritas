// Scorer: aggregates per-case metric scores into a RunResult for a completed eval run.
import { newId } from "@veritas/core";
import type { CaseMetricScore, MetricSummary, RunResult } from "./types.js";
import { summarizeAll } from "./metric.js";

/** Options for building a RunResult from raw case scores. */
export interface ScorerOptions {
  readonly runId?: string;
  readonly datasetId: string;
  readonly startedAt: string;
  readonly completedAt: string;
}

/**
 * Aggregate an array of CaseMetricScores into a RunResult, computing
 * per-metric MetricSummary statistics automatically.
 */
export function buildRunResult(
  caseScores: readonly CaseMetricScore[],
  opts: ScorerOptions
): RunResult {
  const summaries: readonly MetricSummary[] = summarizeAll(caseScores);
  return {
    runId: opts.runId ?? newId("run"),
    datasetId: opts.datasetId,
    startedAt: opts.startedAt,
    completedAt: opts.completedAt,
    caseScores,
    summaries,
  };
}

/**
 * Compute an overall scalar score for a RunResult as the unweighted mean of
 * all per-metric mean scores (one mean per metric, then averaged).
 * Returns 0 when there are no summaries.
 */
export function overallScore(result: RunResult): number {
  if (result.summaries.length === 0) return 0;
  const total = result.summaries.reduce((acc, s) => acc + s.mean, 0);
  return total / result.summaries.length;
}

/**
 * Return the MetricSummary for a specific metric id, or undefined if not present.
 */
export function metricSummary(
  result: RunResult,
  metricId: string
): MetricSummary | undefined {
  return result.summaries.find((s) => s.metricId === metricId);
}

/**
 * Filter case scores down to those belonging to a specific metric.
 */
export function caseScoresFor(
  result: RunResult,
  metricId: string
): readonly CaseMetricScore[] {
  return result.caseScores.filter((s) => s.metricId === metricId);
}
