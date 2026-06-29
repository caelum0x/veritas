// Baseline management: save, load, delete, and compare eval run baselines.
import { ok, err, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RunResult, Baseline, MetricDelta, BaselineComparison } from "./types.js";
import { BaselineError } from "./errors.js";

/** In-memory baseline store (keyed by baseline id). */
const store = new Map<string, Baseline>();

/**
 * Promote a RunResult to a named baseline snapshot.
 * Returns the saved Baseline or a BaselineError.
 */
export function saveBaseline(
  run: RunResult,
  label: string
): Result<Baseline, BaselineError> {
  if (!label.trim()) {
    return err(new BaselineError("Baseline label must not be blank"));
  }
  const baseline: Baseline = {
    id: newId("bsl"),
    datasetId: run.datasetId,
    runId: run.runId,
    label: label.trim(),
    createdAt: new Date().toISOString(),
    summaries: run.summaries,
  };
  store.set(baseline.id, baseline);
  return ok(baseline);
}

/**
 * Retrieve a baseline by id.
 * Returns a BaselineError if not found.
 */
export function loadBaseline(id: string): Result<Baseline, BaselineError> {
  const baseline = store.get(id);
  if (baseline === undefined) {
    return err(new BaselineError(`Baseline not found: ${id}`));
  }
  return ok(baseline);
}

/** Delete a baseline by id; returns true if it existed, false otherwise. */
export function deleteBaseline(id: string): boolean {
  return store.delete(id);
}

/** List all baselines for a given dataset, ordered by creation time ascending. */
export function listBaselines(datasetId: string): readonly Baseline[] {
  return Array.from(store.values())
    .filter((b) => b.datasetId === datasetId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Clear every baseline from the in-memory store (useful in tests). */
export function clearAllBaselines(): void {
  store.clear();
}

/**
 * Compare a RunResult against a stored baseline.
 * A metric is considered regressed when the current mean drops more than
 * `regressionThreshold` (default 0.02 = 2 percentage points) below the baseline.
 */
export function compareToBaseline(
  run: RunResult,
  baselineId: string,
  regressionThreshold = 0.02
): Result<BaselineComparison, BaselineError> {
  const bResult = loadBaseline(baselineId);
  if (!bResult.ok) return bResult;

  const baseline = bResult.value;
  const baselineByMetric = new Map(
    baseline.summaries.map((s) => [s.metricId, s.mean])
  );

  const deltas: MetricDelta[] = run.summaries.map((summary) => {
    const baselineMean = baselineByMetric.get(summary.metricId) ?? 0;
    const delta = summary.mean - baselineMean;
    const deltaPercent =
      baselineMean !== 0 ? (delta / baselineMean) * 100 : 0;
    const regressed = delta < -regressionThreshold;
    return {
      metricId: summary.metricId,
      baselineMean,
      currentMean: summary.mean,
      delta,
      deltaPercent,
      regressed,
    };
  });

  return ok({
    baselineId,
    runId: run.runId,
    deltas,
    anyRegressed: deltas.some((d) => d.regressed),
  });
}
