// Regression detection: compares a new RunResult against a baseline to surface regressions.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { MetricSummary, RunResult } from "./types.js";
import { RegressionError } from "./errors.js";

/** A single metric delta between two runs. */
export interface MetricDelta {
  readonly metricId: string;
  readonly baselineMean: number;
  readonly candidateMean: number;
  readonly delta: number;
  readonly isRegression: boolean;
}

/** The result of a regression check between a baseline and a candidate run. */
export interface RegressionReport {
  readonly baselineRunId: string;
  readonly candidateRunId: string;
  readonly deltas: readonly MetricDelta[];
  readonly hasRegression: boolean;
  readonly regressedMetrics: readonly string[];
}

/** Options that control regression sensitivity. */
export interface RegressionOptions {
  /**
   * Minimum absolute drop in mean score that constitutes a regression.
   * Default: 0.02 (2 percentage points).
   */
  readonly threshold?: number;
}

const DEFAULT_THRESHOLD = 0.02;

/**
 * Compare candidate RunResult against a baseline RunResult and return a
 * RegressionReport. A metric is regressed when candidateMean < baselineMean - threshold.
 */
export function detectRegressions(
  baseline: RunResult,
  candidate: RunResult,
  opts: RegressionOptions = {}
): Result<RegressionReport, RegressionError> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;

  if (threshold < 0) {
    return err(new RegressionError("Regression threshold must be >= 0"));
  }

  const baselineByMetric = indexByMetric(baseline.summaries);
  const candidateByMetric = indexByMetric(candidate.summaries);

  const allMetricIds = new Set([
    ...baselineByMetric.keys(),
    ...candidateByMetric.keys(),
  ]);

  const deltas: MetricDelta[] = [];

  for (const metricId of allMetricIds) {
    const base = baselineByMetric.get(metricId);
    const cand = candidateByMetric.get(metricId);

    // Metric only in baseline — treat candidate as 0 (full regression)
    const baselineMean = base?.mean ?? 0;
    const candidateMean = cand?.mean ?? 0;
    const delta = candidateMean - baselineMean;
    const isRegression = delta < -threshold;

    deltas.push({ metricId, baselineMean, candidateMean, delta, isRegression });
  }

  const regressedMetrics = deltas
    .filter((d) => d.isRegression)
    .map((d) => d.metricId);

  return ok({
    baselineRunId: baseline.runId,
    candidateRunId: candidate.runId,
    deltas,
    hasRegression: regressedMetrics.length > 0,
    regressedMetrics,
  });
}

/** Format a RegressionReport as a human-readable string. */
export function formatRegressionReport(report: RegressionReport): string {
  const lines: string[] = [
    `=== Regression Report ===`,
    `Baseline:  ${report.baselineRunId}`,
    `Candidate: ${report.candidateRunId}`,
    ``,
    `--- Metric Deltas ---`,
  ];

  for (const d of report.deltas) {
    const flag = d.isRegression ? " ⚠ REGRESSION" : "";
    lines.push(
      `${d.metricId.padEnd(30)} baseline=${pct(d.baselineMean)} candidate=${pct(d.candidateMean)} delta=${signedPct(d.delta)}${flag}`
    );
  }

  if (report.hasRegression) {
    lines.push(``, `RESULT: REGRESSION detected on: ${report.regressedMetrics.join(", ")}`);
  } else {
    lines.push(``, `RESULT: No regressions detected.`);
  }

  return lines.join("\n");
}

function indexByMetric(summaries: readonly MetricSummary[]): Map<string, MetricSummary> {
  return new Map(summaries.map((s) => [s.metricId, s]));
}

function pct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function signedPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}
