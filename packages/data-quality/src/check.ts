// Quality check: represents a single data quality check execution and its outcome.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { QualityDimension, CheckSeverity } from "./types.js";

export const CheckStatusSchema = z.enum(["passed", "failed", "skipped", "error"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const CheckResultSchema = z.object({
  checkId: z.string(),
  ruleName: z.string(),
  dimension: z.string(),
  status: CheckStatusSchema,
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  score: z.number().min(0).max(1),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  affectedRows: z.number().int().nonnegative().optional(),
  totalRows: z.number().int().nonnegative().optional(),
  executedAt: z.string(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

export interface CheckContext {
  readonly datasetId: string;
  readonly columnName?: string;
  readonly sampleSize?: number;
  readonly executedAt: string;
}

export interface DataCheck {
  readonly checkId: string;
  readonly ruleName: string;
  readonly dimension: QualityDimension;
  readonly severity: CheckSeverity;
  run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>>;
}

export function makeCheckResult(
  params: Omit<CheckResult, "executedAt"> & { executedAt?: string }
): CheckResult {
  return CheckResultSchema.parse({
    ...params,
    executedAt: params.executedAt ?? new Date().toISOString(),
  });
}

export function passedCheck(
  checkId: string,
  ruleName: string,
  dimension: QualityDimension,
  severity: CheckSeverity,
  score: number,
  message: string,
  details?: Record<string, unknown>
): Result<CheckResult> {
  return ok(
    makeCheckResult({ checkId, ruleName, dimension, severity, score, status: "passed", message, details })
  );
}

export function failedCheck(
  checkId: string,
  ruleName: string,
  dimension: QualityDimension,
  severity: CheckSeverity,
  score: number,
  message: string,
  affectedRows?: number,
  totalRows?: number,
  details?: Record<string, unknown>
): Result<CheckResult> {
  return ok(
    makeCheckResult({
      checkId,
      ruleName,
      dimension,
      severity,
      score,
      status: "failed",
      message,
      affectedRows,
      totalRows,
      details,
    })
  );
}

export function errorCheck(
  checkId: string,
  ruleName: string,
  dimension: QualityDimension,
  severity: CheckSeverity,
  message: string
): Result<CheckResult> {
  return ok(
    makeCheckResult({ checkId, ruleName, dimension, severity, score: 0, status: "error", message })
  );
}
