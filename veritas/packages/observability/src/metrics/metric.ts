// Counter, Gauge, and Histogram metric interfaces for observability instrumentation.

/** A set of string key-value labels attached to a metric observation. */
export type Labels = Record<string, string>;

/** A monotonically increasing counter metric. */
export interface Counter {
  readonly name: string;
  readonly description: string;
  /** Increment the counter by the given amount (default: 1). */
  inc(labels?: Labels, amount?: number): void;
  /** Return the current value for the given label set. */
  value(labels?: Labels): number;
}

/** A gauge metric that can go up or down. */
export interface Gauge {
  readonly name: string;
  readonly description: string;
  /** Set the gauge to an explicit value. */
  set(value: number, labels?: Labels): void;
  /** Increment the gauge by the given amount (default: 1). */
  inc(labels?: Labels, amount?: number): void;
  /** Decrement the gauge by the given amount (default: 1). */
  dec(labels?: Labels, amount?: number): void;
  /** Return the current value for the given label set. */
  value(labels?: Labels): number;
}

/** A snapshot of a histogram's distribution. */
export interface HistogramSnapshot {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
  /** Bucket upper bounds mapped to cumulative counts. */
  readonly buckets: ReadonlyMap<number, number>;
}

/** A histogram metric that tracks value distributions. */
export interface Histogram {
  readonly name: string;
  readonly description: string;
  readonly bucketBounds: readonly number[];
  /** Record an observation. */
  observe(value: number, labels?: Labels): void;
  /** Return a snapshot of the distribution for the given label set. */
  snapshot(labels?: Labels): HistogramSnapshot;
}

/** Union of all metric types. */
export type Metric = Counter | Gauge | Histogram;

/** Metric kind discriminator. */
export type MetricKind = "counter" | "gauge" | "histogram";

/** Metadata descriptor for a registered metric. */
export interface MetricDescriptor {
  readonly name: string;
  readonly description: string;
  readonly kind: MetricKind;
}

/** Serialized metric sample for export/scraping. */
export interface MetricSample {
  readonly name: string;
  readonly kind: MetricKind;
  readonly labels: Labels;
  readonly value: number;
  readonly timestamp: number;
}
