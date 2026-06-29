// Quality rule: defines the specification and factory for data quality rules.
import { z } from "zod";
import { newId } from "@veritas/core";
import type { QualityDimension, CheckSeverity, RuleType } from "./types.js";
import { QualityDimensionSchema, CheckSeveritySchema, RuleTypeSchema } from "./types.js";

export const RuleConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  dimension: QualityDimensionSchema,
  ruleType: RuleTypeSchema,
  severity: CheckSeveritySchema,
  columnName: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});
export type RuleConfig = z.infer<typeof RuleConfigSchema>;

export function createRule(
  input: Omit<RuleConfig, "id" | "enabled" | "tags"> & {
    id?: string;
    enabled?: boolean;
    tags?: string[];
  }
): RuleConfig {
  return RuleConfigSchema.parse({ id: input.id ?? newId("dq"), ...input });
}

export function notNullRule(
  columnName: string,
  severity: CheckSeverity = "high",
  overrides?: Partial<Omit<RuleConfig, "ruleType" | "dimension">>
): RuleConfig {
  return createRule({
    name: `not_null:${columnName}`,
    description: `Column "${columnName}" must not contain null values`,
    dimension: "completeness",
    ruleType: "not_null",
    severity,
    columnName,
    ...overrides,
  });
}

export function uniqueRule(
  columnName: string,
  severity: CheckSeverity = "high",
  overrides?: Partial<Omit<RuleConfig, "ruleType" | "dimension">>
): RuleConfig {
  return createRule({
    name: `unique:${columnName}`,
    description: `Column "${columnName}" must contain unique values`,
    dimension: "uniqueness",
    ruleType: "unique",
    severity,
    columnName,
    ...overrides,
  });
}

export function regexRule(
  columnName: string,
  pattern: string,
  severity: CheckSeverity = "medium",
  overrides?: Partial<Omit<RuleConfig, "ruleType" | "dimension">>
): RuleConfig {
  return createRule({
    name: `regex:${columnName}`,
    description: `Column "${columnName}" must match pattern ${pattern}`,
    dimension: "validity",
    ruleType: "regex",
    severity,
    columnName,
    params: { pattern },
    ...overrides,
  });
}

export function rangeRule(
  columnName: string,
  min: number,
  max: number,
  severity: CheckSeverity = "medium",
  overrides?: Partial<Omit<RuleConfig, "ruleType" | "dimension">>
): RuleConfig {
  return createRule({
    name: `range:${columnName}`,
    description: `Column "${columnName}" must be between ${min} and ${max}`,
    dimension: "validity",
    ruleType: "range",
    severity,
    columnName,
    params: { min, max },
    ...overrides,
  });
}

export function freshnessRule(
  maxAgeMs: number,
  timestampColumn: string,
  severity: CheckSeverity = "high",
  overrides?: Partial<Omit<RuleConfig, "ruleType" | "dimension">>
): RuleConfig {
  return createRule({
    name: `freshness:${timestampColumn}`,
    description: `Column "${timestampColumn}" must be within ${maxAgeMs}ms of now`,
    dimension: "freshness",
    ruleType: "freshness",
    severity,
    columnName: timestampColumn,
    params: { maxAgeMs },
    ...overrides,
  });
}
