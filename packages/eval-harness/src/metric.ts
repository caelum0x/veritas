// Eval metric: interface and helpers for scoring a single eval case output.
import type { Result } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { EvalCase } from "./case.js";
import type { MetricSummary, CaseMetricScore } from "./types.js";
import { MetricError } from "./errors.js";

/** Context passed to every metric scorer. */
export interface MetricContext {
  readonly evalCase: EvalCase;
  readonly report: VerificationReport;
}

/** A named, composable eval metric. */
export interface Metric {
  readonly id: string;
  readonly description: string;
  /** Score a single case; returns a value in [0, 1]. */
  score(ctx: MetricContext): Result<number, MetricError>;
}

/** Compute per-case scores for all metrics, skipping errors gracefully. */
export function scoreAll(
  metrics: readonly Metric[],
  contexts: readonly MetricContext[]
): readonly CaseMetricScore[] {
  const results: CaseMetricScore[] = [];
  for (const ctx of contexts) {
    for (const metric of metrics) {
      const r = metric.score(ctx);
      if (r.ok) {
        results.push({ caseId: ctx.evalCase.id, metricId: metric.id, score: r.value });
      } else {
        results.push({
          caseId: ctx.evalCase.id,
          metricId: metric.id,
          score: 0,
          detail: r.error instanceof Error ? r.error.message : String(r.error),
        });
      }
    }
  }
  return results;
}

/** Compute a MetricSummary from a flat list of CaseMetricScores for one metric. */
export function summarizeMetric(
  metricId: string,
  scores: readonly CaseMetricScore[]
): MetricSummary {
  const values = scores.filter((s) => s.metricId === metricId).map((s) => s.score);
  if (values.length === 0) {
    return { metricId, mean: 0, min: 0, max: 0, stdDev: 0, sampleCount: 0 };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return { metricId, mean, min, max, stdDev: Math.sqrt(variance), sampleCount: values.length };
}

/** Compute summaries for every metric present in scores. */
export function summarizeAll(
  scores: readonly CaseMetricScore[]
): readonly MetricSummary[] {
  const ids = Array.from(new Set(scores.map((s) => s.metricId)));
  return ids.map((id) => summarizeMetric(id, scores));
}
