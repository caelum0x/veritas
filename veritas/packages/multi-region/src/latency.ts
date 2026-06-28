// Latency-based routing — tracks per-region latency samples and selects lowest-latency healthy region.

import { type Result, ok, err } from "@veritas/core";
import { type RegionId, type Region } from "./region.js";
import { type LatencyMeasurement } from "./types.js";
import { NoHealthyRegionError, LatencyThresholdError } from "./errors.js";

/** Port interface for storing and retrieving latency measurements. */
export interface LatencyStorePort {
  record(measurement: LatencyMeasurement): Promise<void>;
  getLatest(regionId: RegionId): Promise<LatencyMeasurement | undefined>;
  getAll(): Promise<readonly LatencyMeasurement[]>;
}

/** Options controlling latency-based routing decisions. */
export interface LatencyRoutingOptions {
  /** Reject any region whose latest latency exceeds this threshold (ms). */
  readonly maxLatencyMs?: number;
  /** Minimum number of samples required before a region is considered. */
  readonly minSamples?: number;
}

/** Returns the region with the lowest measured latency from the candidate list. */
export async function selectByLatency(
  store: LatencyStorePort,
  candidates: readonly Region[],
  options: LatencyRoutingOptions = {}
): Promise<Result<Region, NoHealthyRegionError | LatencyThresholdError>> {
  const { maxLatencyMs, minSamples = 1 } = options;

  const scored: Array<{ region: Region; latencyMs: number }> = [];

  for (const region of candidates) {
    const measurement = await store.getLatest(region.id as RegionId);
    if (!measurement) continue;
    if (measurement.sampleCount < minSamples) continue;
    if (maxLatencyMs !== undefined && measurement.latencyMs > maxLatencyMs) {
      return err(
        new LatencyThresholdError(region.id as RegionId, measurement.latencyMs, maxLatencyMs)
      );
    }
    scored.push({ region, latencyMs: measurement.latencyMs });
  }

  if (scored.length === 0) {
    return err(new NoHealthyRegionError());
  }

  const best = scored.reduce((a, b) => (a.latencyMs <= b.latencyMs ? a : b));
  return ok(best.region);
}

/** In-memory LatencyStorePort — stores only the latest measurement per region. */
export class InMemoryLatencyStore implements LatencyStorePort {
  private readonly store = new Map<string, LatencyMeasurement>();

  async record(measurement: LatencyMeasurement): Promise<void> {
    const existing = this.store.get(measurement.regionId);
    if (existing) {
      const mergedCount = existing.sampleCount + measurement.sampleCount;
      const mergedLatency =
        (existing.latencyMs * existing.sampleCount + measurement.latencyMs * measurement.sampleCount) /
        mergedCount;
      this.store.set(measurement.regionId, {
        ...measurement,
        latencyMs: mergedLatency,
        sampleCount: mergedCount,
      });
    } else {
      this.store.set(measurement.regionId, measurement);
    }
  }

  async getLatest(regionId: RegionId): Promise<LatencyMeasurement | undefined> {
    return this.store.get(regionId);
  }

  async getAll(): Promise<readonly LatencyMeasurement[]> {
    return Array.from(this.store.values());
  }
}
