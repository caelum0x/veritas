// Freshness checks: verify data timestamps fall within acceptable staleness windows.
import { z } from "zod";
import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import { newId } from "@veritas/core";
import { failedCheck, passedCheck } from "./check.js";
import type { DataCheck, CheckContext, CheckResult } from "./check.js";
import type { CheckSeverity } from "./types.js";

export const FreshnessParamsSchema = z.object({
  maxAgeMs: z.number().int().positive(),
  timestampField: z.string().optional(),
});
export type FreshnessParams = z.infer<typeof FreshnessParamsSchema>;

function extractTimestamp(value: unknown, field?: string): number | null {
  if (field !== undefined && typeof value === "object" && value !== null && field in value) {
    const raw = (value as Record<string, unknown>)[field];
    return parseTimestamp(raw);
  }
  return parseTimestamp(value);
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return isNaN(ms) ? null : ms;
  }
  if (value instanceof Date) return value.getTime();
  return null;
}

export class FreshnessCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "freshness";
  readonly dimension = "freshness" as const;
  readonly severity: CheckSeverity;

  private readonly params: FreshnessParams;

  constructor(params: FreshnessParams, severity: CheckSeverity = "high") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.params = FreshnessParamsSchema.parse(params);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const total = data.length;
    if (total === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No rows to validate freshness.");
    }

    const now = Date.now();
    const { maxAgeMs, timestampField } = this.params;
    const cutoff = now - maxAgeMs;

    let stale = 0;
    let unparseable = 0;

    for (const row of data) {
      const ts = extractTimestamp(row, timestampField);
      if (ts === null) {
        unparseable++;
      } else if (ts < cutoff) {
        stale++;
      }
    }

    const invalid = stale + unparseable;
    const score = 1 - invalid / total;
    const details: Record<string, unknown> = { column: ctx.columnName ?? timestampField, maxAgeMs, stale, unparseable };

    if (invalid === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `All ${total} rows are fresh within ${maxAgeMs}ms.`, details);
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${invalid} of ${total} rows are stale or have unparseable timestamps.`, invalid, total, details);
  }
}

export class DatasetFreshnessCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "dataset_freshness";
  readonly dimension = "freshness" as const;
  readonly severity: CheckSeverity;

  private readonly maxAgeMs: number;
  private readonly lastUpdatedAt: string;

  constructor(lastUpdatedAt: string, maxAgeMs: number, severity: CheckSeverity = "high") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.maxAgeMs = maxAgeMs;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  async run(_data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const ts = Date.parse(this.lastUpdatedAt);
    if (isNaN(ts)) {
      return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 0, `Cannot parse dataset lastUpdatedAt: ${this.lastUpdatedAt}`, undefined, undefined, { column: ctx.columnName });
    }
    const ageMs = Date.now() - ts;
    const score = Math.max(0, 1 - ageMs / (this.maxAgeMs * 2));
    if (ageMs <= this.maxAgeMs) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, `Dataset is fresh: age ${ageMs}ms <= ${this.maxAgeMs}ms.`, { ageMs });
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `Dataset is stale: age ${ageMs}ms exceeds ${this.maxAgeMs}ms.`, undefined, undefined, { ageMs, maxAgeMs: this.maxAgeMs });
  }
}
