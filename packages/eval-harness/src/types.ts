// Shared types for the eval-harness package.
import type { Verdict } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";

/** A single expected claim verdict used in eval cases. */
export interface ExpectedClaimVerdict {
  readonly claimText: string;
  readonly verdict: Verdict;
}

/** The actual output produced by the verifier for an eval case. */
export interface ActualOutput {
  readonly report: VerificationReport;
}

/** Summary statistics for a metric across a run. */
export interface MetricSummary {
  readonly metricId: string;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly stdDev: number;
  readonly sampleCount: number;
}

/** A scored result for a single case + metric pair. */
export interface CaseMetricScore {
  readonly caseId: string;
  readonly metricId: string;
  readonly score: number;
  readonly detail?: string;
}

/** Aggregated run-level results used by reporting and regression detection. */
export interface RunResult {
  readonly runId: string;
  readonly datasetId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly caseScores: readonly CaseMetricScore[];
  readonly summaries: readonly MetricSummary[];
}

/** A persisted baseline snapshot for a dataset + metric combination. */
export interface Baseline {
  readonly id: string;
  readonly datasetId: string;
  readonly runId: string;
  readonly label: string;
  readonly createdAt: string;
  readonly summaries: readonly MetricSummary[];
}

/** Comparison between a current run and a baseline for one metric. */
export interface MetricDelta {
  readonly metricId: string;
  readonly baselineMean: number;
  readonly currentMean: number;
  readonly delta: number;
  readonly deltaPercent: number;
  readonly regressed: boolean;
}

/** Full comparison result between a run and a baseline. */
export interface BaselineComparison {
  readonly baselineId: string;
  readonly runId: string;
  readonly deltas: readonly MetricDelta[];
  readonly anyRegressed: boolean;
}

/** A persisted eval run entry in the store. */
export interface StoredRun {
  readonly runId: string;
  readonly datasetId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly result: RunResult;
}
