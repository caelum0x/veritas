// Service Level Indicator: raw measurement of good events vs total events over a time range.
import { z } from "zod";

export const SliMeasurementSchema = z.object({
  sliName: z.string().min(1),
  windowStartMs: z.number().int().nonnegative(),
  windowEndMs: z.number().int().positive(),
  goodCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

export type SliMeasurement = z.infer<typeof SliMeasurementSchema>;

export function goodRatio(m: SliMeasurement): number {
  if (m.totalCount === 0) return 1; // treat empty window as 100% good
  return m.goodCount / m.totalCount;
}

export function combineMeasurements(measurements: readonly SliMeasurement[]): SliMeasurement | null {
  if (measurements.length === 0) return null;
  const first = measurements[0]!;
  const last = measurements[measurements.length - 1]!;
  let good = 0;
  let total = 0;
  for (const m of measurements) {
    good += m.goodCount;
    total += m.totalCount;
  }
  return Object.freeze({
    sliName: first.sliName,
    windowStartMs: first.windowStartMs,
    windowEndMs: last.windowEndMs,
    goodCount: good,
    totalCount: total,
  });
}

export interface SliSource {
  /** Fetch aggregated measurement for [startMs, endMs). */
  query(sliName: string, startMs: number, endMs: number): Promise<SliMeasurement>;
}

export class InMemorySliSource implements SliSource {
  private readonly buckets: Map<string, SliMeasurement[]> = new Map();

  record(m: SliMeasurement): void {
    const list = this.buckets.get(m.sliName) ?? [];
    list.push(m);
    this.buckets.set(m.sliName, list);
  }

  async query(sliName: string, startMs: number, endMs: number): Promise<SliMeasurement> {
    const list = (this.buckets.get(sliName) ?? []).filter(
      (m) => m.windowStartMs >= startMs && m.windowEndMs <= endMs,
    );
    const combined = combineMeasurements(list);
    if (combined) return combined;
    return Object.freeze({ sliName, windowStartMs: startMs, windowEndMs: endMs, goodCount: 0, totalCount: 0 });
  }
}
