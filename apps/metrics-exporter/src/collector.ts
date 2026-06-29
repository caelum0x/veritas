// Collects MetricSample snapshots from one or more MetricsRegistry instances.

import { MetricsRegistry, type MetricSample } from "@veritas/observability";

export interface CollectedMetrics {
  readonly samples: readonly MetricSample[];
  readonly collectedAt: number;
}

/** Aggregate samples from multiple registries into a single snapshot. */
export function collectAll(registries: readonly MetricsRegistry[]): CollectedMetrics {
  const collectedAt = Date.now();
  const samples: MetricSample[] = [];
  for (const registry of registries) {
    samples.push(...registry.collect());
  }
  return { samples, collectedAt };
}

/** Build a collector function that always pulls from the given registries. */
export function makeCollector(
  registries: readonly MetricsRegistry[]
): () => CollectedMetrics {
  return () => collectAll(registries);
}
