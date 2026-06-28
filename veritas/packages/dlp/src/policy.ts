// DLP policy: defines which finding types to enforce and what action to take
import { z } from "zod";
import { newId } from "@veritas/core";
import { FindingTypeSchema, SeveritySchema } from "./finding.js";
import { type MaskStrategy } from "./masking.js";

export const PolicyActionSchema = z.enum(["ALLOW", "MASK", "BLOCK"]);
export type PolicyAction = z.infer<typeof PolicyActionSchema>;

export const MaskStrategySchema = z.enum(["REDACT", "PARTIAL", "HASH", "TOKENIZE"]);

export const PolicyRuleSchema = z.object({
  findingType: FindingTypeSchema,
  minSeverity: SeveritySchema,
  action: PolicyActionSchema,
  maskStrategy: MaskStrategySchema.optional(),
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const DlpPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
  rules: z.array(PolicyRuleSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DlpPolicy = z.infer<typeof DlpPolicySchema>;

const SEVERITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

export function severityAtLeast(
  actual: z.infer<typeof SeveritySchema>,
  min: z.infer<typeof SeveritySchema>,
): boolean {
  return SEVERITY_ORDER[actual] >= SEVERITY_ORDER[min];
}

export function findMatchingRule(
  policy: DlpPolicy,
  findingType: z.infer<typeof FindingTypeSchema>,
  severity: z.infer<typeof SeveritySchema>,
): PolicyRule | undefined {
  return policy.rules.find(
    (r) =>
      r.findingType === findingType && severityAtLeast(severity, r.minSeverity),
  );
}

export function resolveAction(
  policy: DlpPolicy,
  findingType: z.infer<typeof FindingTypeSchema>,
  severity: z.infer<typeof SeveritySchema>,
): PolicyAction {
  if (!policy.enabled) return "ALLOW";
  const rule = findMatchingRule(policy, findingType, severity);
  return rule?.action ?? "ALLOW";
}

export function makeDlpPolicy(
  name: string,
  rules: readonly PolicyRule[],
  description?: string,
): DlpPolicy {
  const now = new Date().toISOString();
  return {
    id: newId("policy"),
    name,
    description,
    enabled: true,
    rules: [...rules],
    createdAt: now,
    updatedAt: now,
  };
}

/** Strict default policy: mask all PII, block high-entropy secrets */
export function defaultPolicy(): DlpPolicy {
  return makeDlpPolicy("default", [
    { findingType: "EMAIL", minSeverity: "LOW", action: "MASK", maskStrategy: "PARTIAL" },
    { findingType: "SSN", minSeverity: "LOW", action: "MASK", maskStrategy: "PARTIAL" },
    { findingType: "CREDIT_CARD", minSeverity: "LOW", action: "MASK", maskStrategy: "PARTIAL" },
    { findingType: "PHONE", minSeverity: "LOW", action: "MASK", maskStrategy: "PARTIAL" },
    { findingType: "SECRET_ENTROPY", minSeverity: "HIGH", action: "BLOCK" },
    { findingType: "SECRET_ENTROPY", minSeverity: "MEDIUM", action: "MASK", maskStrategy: "REDACT" },
  ], "Built-in strict DLP policy");
}
