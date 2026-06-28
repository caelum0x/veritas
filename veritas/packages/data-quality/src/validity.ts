// Validity checks: ensure values conform to expected formats, ranges, or enumerations.
import { z } from "zod";
import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import { makeCheckResult, failedCheck, passedCheck } from "./check.js";
import type { DataCheck, CheckContext, CheckResult } from "./check.js";
import type { CheckSeverity } from "./types.js";
import { newId } from "@veritas/core";

export const RegexRuleParamsSchema = z.object({
  pattern: z.string(),
  flags: z.string().optional(),
});
export type RegexRuleParams = z.infer<typeof RegexRuleParamsSchema>;

export const RangeRuleParamsSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  inclusive: z.boolean().default(true),
});
export type RangeRuleParams = z.infer<typeof RangeRuleParamsSchema>;

export const EnumRuleParamsSchema = z.object({
  allowedValues: z.array(z.string()),
  caseSensitive: z.boolean().default(true),
});
export type EnumRuleParams = z.infer<typeof EnumRuleParamsSchema>;

function countInvalid(data: readonly unknown[], predicate: (v: unknown) => boolean): number {
  return data.filter((v) => v !== null && v !== undefined && !predicate(v)).length;
}

export class RegexValidityCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "regex_validity";
  readonly dimension = "validity" as const;
  readonly severity: CheckSeverity;

  private readonly regex: RegExp;

  constructor(params: RegexRuleParams, severity: CheckSeverity = "high") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.regex = new RegExp(params.pattern, params.flags);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const total = data.length;
    if (total === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No rows to validate.");
    }
    const nonNull = data.filter((v) => v !== null && v !== undefined);
    const invalid = nonNull.filter((v) => typeof v !== "string" || !this.regex.test(v)).length;
    const score = nonNull.length === 0 ? 1 : 1 - invalid / nonNull.length;
    if (invalid === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `All ${nonNull.length} non-null values match regex.`, { column: ctx.columnName });
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${invalid} of ${nonNull.length} values fail regex pattern.`, invalid, total, { column: ctx.columnName, pattern: this.regex.source });
  }
}

export class RangeValidityCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "range_validity";
  readonly dimension = "validity" as const;
  readonly severity: CheckSeverity;

  private readonly params: RangeRuleParams;

  constructor(params: RangeRuleParams, severity: CheckSeverity = "high") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.params = RangeRuleParamsSchema.parse(params);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const total = data.length;
    if (total === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No rows to validate.");
    }
    const nonNull = data.filter((v) => v !== null && v !== undefined);
    const { min, max, inclusive } = this.params;
    const invalid = countInvalid(nonNull, (v) => {
      if (typeof v !== "number") return false;
      if (min !== undefined) {
        if (inclusive ? v < min : v <= min) return false;
      }
      if (max !== undefined) {
        if (inclusive ? v > max : v >= max) return false;
      }
      return true;
    });
    const score = nonNull.length === 0 ? 1 : 1 - invalid / nonNull.length;
    if (invalid === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `All ${nonNull.length} values within range.`, { column: ctx.columnName });
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${invalid} of ${nonNull.length} values outside range.`, invalid, total, { column: ctx.columnName, min, max });
  }
}

export class EnumValidityCheck implements DataCheck {
  readonly checkId: string;
  readonly ruleName = "enum_validity";
  readonly dimension = "validity" as const;
  readonly severity: CheckSeverity;

  private readonly params: EnumRuleParams;

  constructor(params: EnumRuleParams, severity: CheckSeverity = "high") {
    this.checkId = newId("dq");
    this.severity = severity;
    this.params = EnumRuleParamsSchema.parse(params);
  }

  async run(data: readonly unknown[], ctx: CheckContext): Promise<Result<CheckResult>> {
    const total = data.length;
    if (total === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, 1, "No rows to validate.");
    }
    const nonNull = data.filter((v) => v !== null && v !== undefined);
    const { allowedValues, caseSensitive } = this.params;
    const allowed = new Set(caseSensitive ? allowedValues : allowedValues.map((v) => v.toLowerCase()));
    const invalid = countInvalid(nonNull, (v) => {
      const str = String(v);
      return allowed.has(caseSensitive ? str : str.toLowerCase());
    });
    const score = nonNull.length === 0 ? 1 : 1 - invalid / nonNull.length;
    if (invalid === 0) {
      return passedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `All ${nonNull.length} values in allowed set.`, { column: ctx.columnName });
    }
    return failedCheck(this.checkId, this.ruleName, this.dimension, this.severity, score, `${invalid} of ${nonNull.length} values not in enum.`, invalid, total, { column: ctx.columnName, allowedValues });
  }
}
