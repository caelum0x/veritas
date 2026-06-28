// Collects and aggregates live load metrics into utilization points.
import { Result, ok, err } from "@veritas/core";
import { MetricSample, UtilizationPoint } from "./types.js";
import { InsufficientDataError } from "./errors.js";

/** Port: metric source that the planner reads from. */
export interface MetricSource {
  fetchSamples(resourceNames: readonly string[], windowMs: number): Promise<MetricSample[]>;
}

/** In-memory stub for MetricSource — returns injected samples. */
export class InMemoryMetricSource implements MetricSource {
  private readonly samples: MetricSample[];
  constructor(samples: MetricSample[]) {
    this.samples = samples;
  }
  async fetchSamples(resourceNames: readonly string[]): Promise<MetricSample[]> {
    return this.samples.filter((s) => resourceNames.includes(s.resourceName));
  }
}

/** Convert raw metric samples into normalised utilization points (ratio = used/total). */
export function samplesToUtilization(samples: MetricSample[]): Result<UtilizationPoint[], InsufficientDataError> {
  if (samples.length === 0) {
    return err(new InsufficientDataError("No metric samples provided"));
  }
  const points: UtilizationPoint[] = samples.map((s) => ({
    timestampIso: s.timestampIso,
    resourceName: s.resourceName,
    ratio: s.used / s.total,
  }));
  return ok(points);
}

/** Compute the average utilization ratio for each resource across all samples. */
export function averageUtilization(
  points: UtilizationPoint[]
): Record<string, number> {
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const p of points) {
    const entry = acc[p.resourceName] ?? { sum: 0, count: 0 };
    acc[p.resourceName] = { sum: entry.sum + p.ratio, count: entry.count + 1 };
  }
  return Object.fromEntries(
    Object.entries(acc).map(([name, { sum, count }]) => [name, sum / count])
  );
}

/** Return peak (maximum) utilization ratio per resource. */
export function peakUtilization(
  points: UtilizationPoint[]
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const p of points) {
    const prev = acc[p.resourceName] ?? 0;
    acc[p.resourceName] = Math.max(prev, p.ratio);
  }
  return acc;
}
