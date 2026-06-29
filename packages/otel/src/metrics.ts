// OTel-aligned metrics facade — thin wrappers over @veritas/observability MetricsRegistry.

import {
  MetricsRegistry,
  globalRegistry,
  type Counter,
  type Gauge,
  type Histogram,
  type Labels,
} from "@veritas/observability";

/** Options for creating a metric instrument. */
export interface MetricOptions {
  readonly description?: string;
  /** Histogram bucket boundaries in milliseconds (histograms only). */
  readonly boundaries?: number[];
}

/** Facade that creates and caches OTel-style instruments from an underlying registry. */
export class OtelMeterProvider {
  private readonly registry: MetricsRegistry;
  private readonly prefix: string;

  constructor(registry: MetricsRegistry = globalRegistry, prefix = "") {
    this.registry = registry;
    this.prefix = prefix ? `${prefix}.` : "";
  }

  private key(name: string): string {
    return `${this.prefix}${name}`;
  }

  /** Create or retrieve a monotonically-increasing counter. */
  createCounter(name: string, opts: MetricOptions = {}): Counter {
    return this.registry.counter(
      this.key(name),
      opts.description ?? name,
    );
  }

  /** Create or retrieve an up-down gauge. */
  createGauge(name: string, opts: MetricOptions = {}): Gauge {
    return this.registry.gauge(
      this.key(name),
      opts.description ?? name,
    );
  }

  /** Create or retrieve a histogram. */
  createHistogram(name: string, opts: MetricOptions = {}): Histogram {
    return this.registry.histogram(
      this.key(name),
      opts.description ?? name,
      opts.boundaries,
    );
  }
}

/** Convenience meter scoped to the Veritas platform. */
export const veritas = new OtelMeterProvider(globalRegistry, "veritas");

/** Record an HTTP server request duration (ms) with method + status labels. */
export function recordHttpDuration(
  histogram: Histogram,
  durationMs: number,
  labels: Labels,
): void {
  histogram.observe(durationMs, labels);
}

/** Increment a span-export attempt counter by result. */
export function recordExportAttempt(
  counter: Counter,
  success: boolean,
  exporterName: string,
): void {
  counter.inc({ exporter: exporterName, result: success ? "ok" : "error" });
}

/** Track the number of in-flight spans currently being processed. */
export function setActiveSpanCount(gauge: Gauge, count: number, service: string): void {
  gauge.set(count, { service });
}

/** Default histogram boundaries suitable for HTTP latency (ms). */
export const HTTP_LATENCY_BOUNDARIES: readonly number[] = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

/** Default histogram boundaries for message processing duration (ms). */
export const MESSAGE_DURATION_BOUNDARIES: readonly number[] = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000,
];
