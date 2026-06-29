// In-memory metrics registry for creating and collecting Counter, Gauge, and Histogram metrics.

import {
  Counter,
  Gauge,
  Histogram,
  HistogramSnapshot,
  Labels,
  MetricDescriptor,
  MetricKind,
  MetricSample,
} from "./metric.js";

function labelsKey(labels: Labels = {}): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(",");
}

class InMemoryCounter implements Counter {
  readonly name: string;
  readonly description: string;
  private readonly values = new Map<string, number>();

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  inc(labels?: Labels, amount = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + amount);
  }

  value(labels?: Labels): number {
    return this.values.get(labelsKey(labels)) ?? 0;
  }

  samples(): Array<{ labels: Labels; value: number }> {
    return Array.from(this.values.entries()).map(([key, value]) => ({
      labels: parseKey(key),
      value,
    }));
  }
}

class InMemoryGauge implements Gauge {
  readonly name: string;
  readonly description: string;
  private readonly values = new Map<string, number>();

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  set(value: number, labels?: Labels): void {
    this.values.set(labelsKey(labels), value);
  }

  inc(labels?: Labels, amount = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + amount);
  }

  dec(labels?: Labels, amount = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - amount);
  }

  value(labels?: Labels): number {
    return this.values.get(labelsKey(labels)) ?? 0;
  }

  samples(): Array<{ labels: Labels; value: number }> {
    return Array.from(this.values.entries()).map(([key, value]) => ({
      labels: parseKey(key),
      value,
    }));
  }
}

class InMemoryHistogram implements Histogram {
  readonly name: string;
  readonly description: string;
  readonly bucketBounds: readonly number[];

  private readonly data = new Map<
    string,
    { count: number; sum: number; min: number; max: number; buckets: number[] }
  >();

  constructor(name: string, description: string, bucketBounds: number[]) {
    this.name = name;
    this.description = description;
    this.bucketBounds = [...bucketBounds].sort((a, b) => a - b);
  }

  observe(value: number, labels?: Labels): void {
    const key = labelsKey(labels);
    const existing = this.data.get(key);
    if (existing) {
      existing.count += 1;
      existing.sum += value;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
      for (let i = 0; i < this.bucketBounds.length; i++) {
        const bound = this.bucketBounds[i];
        if (bound !== undefined && value <= bound) {
          existing.buckets[i] = (existing.buckets[i] ?? 0) + 1;
        }
      }
    } else {
      const buckets = this.bucketBounds.map((bound) =>
        value <= bound ? 1 : 0
      );
      this.data.set(key, { count: 1, sum: value, min: value, max: value, buckets });
    }
  }

  snapshot(labels?: Labels): HistogramSnapshot {
    const key = labelsKey(labels);
    const d = this.data.get(key);
    if (!d) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        buckets: new Map(this.bucketBounds.map((b) => [b, 0])),
      };
    }
    const buckets = new Map<number, number>();
    let cumulative = 0;
    for (let i = 0; i < this.bucketBounds.length; i++) {
      cumulative += d.buckets[i] ?? 0;
      const bound = this.bucketBounds[i];
      if (bound !== undefined) {
        buckets.set(bound, cumulative);
      }
    }
    return { count: d.count, sum: d.sum, min: d.min, max: d.max, buckets };
  }

  allSamples(): Array<{ labels: Labels; count: number; sum: number }> {
    return Array.from(this.data.entries()).map(([key, d]) => ({
      labels: parseKey(key),
      count: d.count,
      sum: d.sum,
    }));
  }
}

function parseKey(key: string): Labels {
  if (!key) return {};
  return Object.fromEntries(
    key.split(",").map((part) => {
      const idx = part.indexOf("=");
      return [part.slice(0, idx), part.slice(idx + 1)];
    })
  );
}

/** Default histogram bucket bounds in milliseconds. */
export const DEFAULT_HISTOGRAM_BUCKETS: readonly number[] = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

/** Registry for creating and listing in-memory metrics. */
export class MetricsRegistry {
  private readonly counters = new Map<string, InMemoryCounter>();
  private readonly gauges = new Map<string, InMemoryGauge>();
  private readonly histograms = new Map<string, InMemoryHistogram>();

  counter(name: string, description: string): Counter {
    const existing = this.counters.get(name);
    if (existing) return existing;
    const c = new InMemoryCounter(name, description);
    this.counters.set(name, c);
    return c;
  }

  gauge(name: string, description: string): Gauge {
    const existing = this.gauges.get(name);
    if (existing) return existing;
    const g = new InMemoryGauge(name, description);
    this.gauges.set(name, g);
    return g;
  }

  histogram(
    name: string,
    description: string,
    bucketBounds: number[] = [...DEFAULT_HISTOGRAM_BUCKETS]
  ): Histogram {
    const existing = this.histograms.get(name);
    if (existing) return existing;
    const h = new InMemoryHistogram(name, description, bucketBounds);
    this.histograms.set(name, h);
    return h;
  }

  descriptors(): MetricDescriptor[] {
    const result: MetricDescriptor[] = [];
    for (const [name, c] of this.counters)
      result.push({ name, description: c.description, kind: "counter" as MetricKind });
    for (const [name, g] of this.gauges)
      result.push({ name, description: g.description, kind: "gauge" as MetricKind });
    for (const [name, h] of this.histograms)
      result.push({ name, description: h.description, kind: "histogram" as MetricKind });
    return result;
  }

  collect(): MetricSample[] {
    const now = Date.now();
    const samples: MetricSample[] = [];

    for (const c of this.counters.values()) {
      for (const { labels, value } of c.samples()) {
        samples.push({ name: c.name, kind: "counter", labels, value, timestamp: now });
      }
    }

    for (const g of this.gauges.values()) {
      for (const { labels, value } of g.samples()) {
        samples.push({ name: g.name, kind: "gauge", labels, value, timestamp: now });
      }
    }

    for (const h of this.histograms.values()) {
      for (const { labels, count, sum } of h.allSamples()) {
        samples.push({ name: `${h.name}_count`, kind: "counter", labels, value: count, timestamp: now });
        samples.push({ name: `${h.name}_sum`, kind: "counter", labels, value: sum, timestamp: now });
      }
    }

    return samples;
  }
}

/** Singleton global metrics registry. */
export const globalRegistry = new MetricsRegistry();
