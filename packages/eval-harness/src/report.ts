// Eval report: human-readable summary of a completed eval run.
import type { RunResult, MetricSummary } from "./types.js";
import { overallScore } from "./scorer.js";

/** A structured, serialisable eval report for a single run. */
export interface EvalReport {
  readonly runId: string;
  readonly datasetId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly overallScore: number;
  readonly metricSummaries: readonly MetricSummary[];
  readonly failedCases: readonly string[];
  readonly generatedAt: string;
}

/**
 * Build an EvalReport from a RunResult.
 * failedCases are case ids with a zero score on any metric (possible execution errors).
 */
export function buildEvalReport(result: RunResult): EvalReport {
  const start = Date.parse(result.startedAt);
  const end = Date.parse(result.completedAt);
  const durationMs = Number.isFinite(end - start) ? end - start : 0;

  // Collect case ids that scored 0 on at least one metric (likely errors)
  const failedSet = new Set<string>();
  for (const cs of result.caseScores) {
    if (cs.score === 0 && cs.detail !== undefined) {
      failedSet.add(cs.caseId);
    }
  }

  return {
    runId: result.runId,
    datasetId: result.datasetId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationMs,
    overallScore: overallScore(result),
    metricSummaries: result.summaries,
    failedCases: Array.from(failedSet),
    generatedAt: new Date().toISOString(),
  };
}

/** Render an EvalReport as a plain-text summary string for logging/display. */
export function formatEvalReport(report: EvalReport): string {
  const lines: string[] = [
    `=== Eval Report ===`,
    `Run:       ${report.runId}`,
    `Dataset:   ${report.datasetId}`,
    `Started:   ${report.startedAt}`,
    `Completed: ${report.completedAt}`,
    `Duration:  ${report.durationMs}ms`,
    `Overall:   ${(report.overallScore * 100).toFixed(2)}%`,
    ``,
    `--- Metrics ---`,
  ];

  for (const s of report.metricSummaries) {
    lines.push(
      `${s.metricId.padEnd(30)} mean=${pct(s.mean)} min=${pct(s.min)} max=${pct(s.max)} stdDev=${pct(s.stdDev)} n=${s.sampleCount}`
    );
  }

  if (report.failedCases.length > 0) {
    lines.push(``, `--- Failed Cases (${report.failedCases.length}) ---`);
    for (const id of report.failedCases) lines.push(`  ${id}`);
  }

  lines.push(``, `Generated: ${report.generatedAt}`);
  return lines.join("\n");
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
