// Sampler port and built-in implementations for controlling which spans are recorded.

import type { StartSpanOptions } from "@veritas/observability";

/** Decision returned by a sampler for each span candidate. */
export type SamplingDecision = "record_and_sample" | "drop";

/** Sampler port interface — decides whether a span should be recorded. */
export interface Sampler {
  /** Returns a sampling decision for the given span candidate. */
  shouldSample(name: string, options?: StartSpanOptions): SamplingDecision;
  /** Human-readable description of this sampler. */
  readonly description: string;
}

/** Always records every span. */
export class AlwaysOnSampler implements Sampler {
  readonly description = "AlwaysOnSampler";

  shouldSample(_name: string, _options?: StartSpanOptions): SamplingDecision {
    return "record_and_sample";
  }
}

/** Never records any span. */
export class AlwaysOffSampler implements Sampler {
  readonly description = "AlwaysOffSampler";

  shouldSample(_name: string, _options?: StartSpanOptions): SamplingDecision {
    return "drop";
  }
}

/** Records spans with probability equal to the configured ratio (0–1). */
export class TraceIdRatioSampler implements Sampler {
  readonly description: string;
  private readonly ratio: number;

  constructor(ratio: number) {
    if (ratio < 0 || ratio > 1) {
      throw new RangeError(`Sampling ratio must be between 0 and 1, got ${ratio}`);
    }
    this.ratio = ratio;
    this.description = `TraceIdRatioSampler{${ratio}}`;
  }

  shouldSample(_name: string, options?: StartSpanOptions): SamplingDecision {
    // Use the traceId's first 8 hex digits as a 32-bit unsigned int for determinism.
    const traceId = options?.traceId;
    if (traceId && traceId.length >= 8) {
      const value = parseInt(traceId.slice(0, 8), 16) / 0xffffffff;
      return value < this.ratio ? "record_and_sample" : "drop";
    }
    // Fall back to random when no traceId is available.
    return Math.random() < this.ratio ? "record_and_sample" : "drop";
  }
}

/** Delegates to a parent sampler; falls back to the root sampler when there is no parent. */
export class ParentBasedSampler implements Sampler {
  readonly description: string;
  private readonly root: Sampler;

  constructor(root: Sampler) {
    this.root = root;
    this.description = `ParentBased{${root.description}}`;
  }

  shouldSample(name: string, options?: StartSpanOptions): SamplingDecision {
    // If a parent span ID is present the parent already made a sampling decision — honour it.
    if (options?.parentSpanId !== undefined) {
      return "record_and_sample";
    }
    return this.root.shouldSample(name, options);
  }
}

/** Singleton always-on sampler for use when no explicit sampler is configured. */
export const alwaysOnSampler: Sampler = new AlwaysOnSampler();

/** Singleton always-off sampler. */
export const alwaysOffSampler: Sampler = new AlwaysOffSampler();
