// Core DLP domain types: findings, policies, scan results, sensitivity levels
import { z } from "zod";

export const PiiTypeSchema = z.enum([
  "EMAIL",
  "SSN",
  "CREDIT_CARD",
  "PHONE",
  "SECRET",
]);
export type PiiType = z.infer<typeof PiiTypeSchema>;

export const SensitivityLevelSchema = z.enum([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);
export type SensitivityLevel = z.infer<typeof SensitivityLevelSchema>;

export const MaskStrategySchema = z.enum([
  "REDACT",
  "HASH",
  "PARTIAL",
  "TOKENIZE",
]);
export type MaskStrategy = z.infer<typeof MaskStrategySchema>;

export const DlpFindingSchema = z.object({
  id: z.string(),
  piiType: PiiTypeSchema,
  value: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  field: z.string().optional(),
});
export type DlpFinding = z.infer<typeof DlpFindingSchema>;

export const DlpPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  piiTypes: z.array(PiiTypeSchema),
  maskStrategy: MaskStrategySchema,
  minimumSensitivity: SensitivityLevelSchema,
  blockOnViolation: z.boolean(),
  enabled: z.boolean(),
});
export type DlpPolicy = z.infer<typeof DlpPolicySchema>;

export const ScanResultSchema = z.object({
  input: z.string(),
  findings: z.array(DlpFindingSchema),
  sensitivity: SensitivityLevelSchema,
  redacted: z.string(),
  violated: z.boolean(),
  policyId: z.string().optional(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

export const PatternMatchSchema = z.object({
  piiType: PiiTypeSchema,
  regex: z.instanceof(RegExp),
  confidence: z.number().min(0).max(1),
});
export type PatternMatch = z.infer<typeof PatternMatchSchema>;
