// Sample incoming reports at a configured rate for downstream audit.

import { ok, type Result } from "@veritas/core";

export interface SampleRecord {
  readonly reportId: string;
  readonly sampledAt: string;
  readonly payload: unknown;
}

export interface Sampler {
  /** Returns the sampled record if selected; undefined otherwise. */
  maybeSample(reportId: string, payload: unknown, asOf?: string): Result<SampleRecord | undefined>;
  /** All records collected so far. */
  records(): readonly SampleRecord[];
  /** Remove all stored samples. */
  clear(): void;
}

export function createSampler(sampleRate: number = 0.1, maxRecords: number = 1_000): Sampler {
  const stored: SampleRecord[] = [];
  const rate = Math.min(1, Math.max(0, sampleRate));

  return {
    maybeSample(reportId, payload, asOf) {
      if (Math.random() > rate) return ok(undefined);

      const record: SampleRecord = {
        reportId,
        sampledAt: asOf ?? new Date().toISOString(),
        payload,
      };

      if (stored.length >= maxRecords) {
        stored.shift();
      }
      stored.push(record);

      return ok(record);
    },

    records() {
      return [...stored];
    },

    clear() {
      stored.splice(0, stored.length);
    },
  };
}
