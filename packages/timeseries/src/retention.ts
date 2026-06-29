// Retention policy: prune data points older than a configured TTL
import { ok, err, type Result } from "@veritas/core";
import type { DataPoint } from "./point.js";
import type { TimeSeries } from "./series.js";
import { RetentionError } from "./errors.js";

export interface RetentionPolicy {
  readonly seriesId: string;
  /** Maximum age of data points in milliseconds */
  readonly maxAgeMs: number;
}

export interface RetentionStore {
  set(policy: RetentionPolicy): void;
  get(seriesId: string): RetentionPolicy | undefined;
  delete(seriesId: string): boolean;
  list(): readonly RetentionPolicy[];
}

export function createInMemoryRetentionStore(): RetentionStore {
  const policies = new Map<string, RetentionPolicy>();
  return {
    set(policy) { policies.set(policy.seriesId, policy); },
    get(seriesId) { return policies.get(seriesId); },
    delete(seriesId) { return policies.delete(seriesId); },
    list() { return [...policies.values()]; },
  };
}

export function applyRetention(
  series: TimeSeries,
  policy: RetentionPolicy,
  nowMs: number,
): Result<readonly DataPoint[], RetentionError> {
  if (policy.maxAgeMs <= 0) {
    return err(new RetentionError("maxAgeMs must be positive"));
  }
  const cutoff = nowMs - policy.maxAgeMs;
  const retained = series.points.filter((p) => p.timestamp >= cutoff);
  return ok(retained);
}

export function pruneAll(
  seriesMap: ReadonlyMap<string, TimeSeries>,
  store: RetentionStore,
  nowMs: number,
): ReadonlyMap<string, readonly DataPoint[]> {
  const result = new Map<string, readonly DataPoint[]>();
  for (const [id, series] of seriesMap) {
    const policy = store.get(id);
    if (!policy) {
      result.set(id, series.points);
      continue;
    }
    const pruned = applyRetention(series, policy, nowMs);
    result.set(id, pruned.ok ? pruned.value : series.points);
  }
  return result;
}
