// Eval store: in-memory persistence for RunResults with lookup helpers.
import { ok, err, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RunResult, StoredRun } from "./types.js";
import { StoreError } from "./errors.js";

/** In-memory store keyed by runId. */
const runs = new Map<string, StoredRun>();

/**
 * Persist a RunResult.
 * Returns the StoredRun on success or a StoreError if the run id already exists.
 */
export function storeRun(result: RunResult): Result<StoredRun, StoreError> {
  if (runs.has(result.runId)) {
    return err(new StoreError(`Run already stored: ${result.runId}`));
  }
  const stored: StoredRun = {
    runId: result.runId,
    datasetId: result.datasetId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    result,
  };
  runs.set(result.runId, stored);
  return ok(stored);
}

/**
 * Retrieve a stored run by id.
 * Returns a StoreError if not found.
 */
export function getRun(runId: string): Result<StoredRun, StoreError> {
  const stored = runs.get(runId);
  if (stored === undefined) {
    return err(new StoreError(`Run not found: ${runId}`));
  }
  return ok(stored);
}

/**
 * List all stored runs for a dataset, ordered by startedAt descending (newest first).
 */
export function listRuns(datasetId: string): readonly StoredRun[] {
  return Array.from(runs.values())
    .filter((r) => r.datasetId === datasetId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * List all stored runs across all datasets, ordered by startedAt descending.
 */
export function listAllRuns(): readonly StoredRun[] {
  return Array.from(runs.values()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt)
  );
}

/** Delete a stored run by id. Returns true if it existed. */
export function deleteRun(runId: string): boolean {
  return runs.delete(runId);
}

/** Remove all stored runs (useful in tests or when resetting state). */
export function clearAllRuns(): void {
  runs.clear();
}

/** Return the most recent stored run for a dataset, if any. */
export function latestRun(datasetId: string): StoredRun | undefined {
  return listRuns(datasetId)[0];
}
