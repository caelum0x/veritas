// Core types for the privacy module
import { z } from "zod";

export const PrivacyFieldSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  sensitivity: z.enum(["direct-identifier", "quasi-identifier", "sensitive", "non-sensitive"]),
});

export type PrivacyField = z.infer<typeof PrivacyFieldSchema>;

export const AnonymizationStrategySchema = z.enum([
  "suppress",
  "generalize",
  "pseudonymize",
  "noise",
  "k-anonymize",
]);

export type AnonymizationStrategy = z.infer<typeof AnonymizationStrategySchema>;

export const GeneralizationRuleSchema = z.object({
  field: z.string(),
  type: z.enum(["range", "category", "truncate", "mask"]),
  /** For numeric range: bucket size. For truncate: length. */
  parameter: z.number().optional(),
  /** For category: mapping from specific to general value. */
  mapping: z.record(z.string()).optional(),
});

export type GeneralizationRule = z.infer<typeof GeneralizationRuleSchema>;

export const SuppressionRuleSchema = z.object({
  field: z.string(),
  condition: z.enum(["always", "threshold", "pattern"]),
  /** For threshold: minimum count required to not suppress. */
  threshold: z.number().optional(),
  /** For pattern: regex pattern that triggers suppression. */
  pattern: z.string().optional(),
  replacement: z.unknown().default(null),
});

export type SuppressionRule = z.infer<typeof SuppressionRuleSchema>;

export const PrivacyBudgetSchema = z.object({
  id: z.string(),
  totalEpsilon: z.number().positive(),
  totalDelta: z.number().min(0).max(1),
  usedEpsilon: z.number().min(0),
  usedDelta: z.number().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PrivacyBudget = z.infer<typeof PrivacyBudgetSchema>;

export const BudgetConsumptionSchema = z.object({
  epsilon: z.number().positive(),
  delta: z.number().min(0).max(1).default(0),
  mechanism: z.enum(["laplace", "gaussian", "exponential", "other"]),
  description: z.string().optional(),
});

export type BudgetConsumption = z.infer<typeof BudgetConsumptionSchema>;

export type DataRecord = Readonly<{ [key: string]: unknown }>;

export const KAnonymityConfigSchema = z.object({
  k: z.number().int().min(2),
  quasiIdentifiers: z.array(z.string()),
});

export type KAnonymityConfig = z.infer<typeof KAnonymityConfigSchema>;
