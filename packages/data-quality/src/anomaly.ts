// Anomaly detection: statistical outlier detection using Z-score and IQR methods.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { newId } from "@veritas/core";
import { failedCheck, passedCheck } from "./check.js";
import type { DataCheck, CheckContext, CheckResult } from "./check.js";
import type { CheckSeverity } from "./types.js";

export const ZScoreParamsSchema = z.object({
  threshold: z.number().positive().default(3),
});
export type ZScoreParams = z.infer<typeof ZScoreParamsSchema>;

export const IqrParamsSchema = z.object({
  multiplier: z.number().positive().default(1.5),
});
export type IqrParams = z.infer<typeof IqrParamsSchema>;

function toNumbers(data: readonly unknown[]): number[] {
  return data.filter((v): v is number => typeof v === "number" && isFinite(v));
}

function mean(values: readonly number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: readonly number[], mu: number): number {
  const variance = values.reduce((s, v) => s + (v - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(sorted: readonly number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] as number;
  const frac = idx - lo;
  return (sorted[lo] as number) * (1 - frac) + (sorted[hi] as number) * frac;
}

export class ZScoreAnomalyCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "zscore_anomaly";
  readonly dimension = "anomaly" as const;
  readonly severity: CheckSeverity;

  private readonly params: ZScoreParams;

  constructor(params: Partial<ZScoreParams> = {}, severity: CheckSeverity = "medium") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.params = ZScoreParamsSchema.parse(params);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const numbers = toNumbers(data);
    if (numbers.length < 3) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "Too few numeric values to detect anomalies.", { count: numbers.length });
    }
    const mu = mean(numbers);
    const sd = stddev(numbers, mu);
    if (sd === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "All values are identical; no anomalies.", { column: ctx.columnName });
    }
    const { threshold } = this.params;
    const outliers = numbers.filter((v) => Math.abs((v - mu) / sd) > threshold);
    const score = 1 - outliers.length / numbers.length;
    const details: Record<string, unknown> = { column: ctx.columnName, mean: mu, stddev: sd, threshold, outlierCount: outliers.length, outlierSample: outliers.slice(0, 5) };
    if (outliers.length === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `No Z-score anomalies detected (threshold=${threshold}).`, details);
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${outliers.length} anomalies detected via Z-score (threshold=${threshold}).`, outliers.length, numbers.length, details);
  }
}

export class IqrAnomalyCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "iqr_anomaly";
  readonly dimension = "anomaly" as const;
  readonly severity: CheckSeverity;

  private readonly params: IqrParams;

  constructor(params: Partial<IqrParams> = {}, severity: CheckSeverity = "medium") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.params = IqrParamsSchema.parse(params);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const numbers = toNumbers(data);
    if (numbers.length < 4) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "Too few numeric values for IQR detection.", { count: numbers.length });
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);
    const iqr = q3 - q1;
    const { multiplier } = this.params;
    const lower = q1 - multiplier * iqr;
    const upper = q3 + multiplier * iqr;
    const outliers = numbers.filter((v) => v < lower || v > upper);
    const score = 1 - outliers.length / numbers.length;
    const details: Record<string, unknown> = { column: ctx.columnName, q1, q3, iqr, lower, upper, multiplier, outlierCount: outliers.length, outlierSample: outliers.slice(0, 5) };
    if (outliers.length === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `No IQR anomalies detected (multiplier=${multiplier}).`, details);
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${outliers.length} anomalies detected via IQR (multiplier=${multiplier}).`, outliers.length, numbers.length, details);
  }
}
