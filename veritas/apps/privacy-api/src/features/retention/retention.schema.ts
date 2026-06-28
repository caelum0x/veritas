// Zod schemas for retention HTTP request/response validation.

import { z } from "zod";
import {
  RetentionCategorySchema,
  RetentionActionSchema,
  LegalHoldStatusSchema,
} from "@veritas/retention";

export const CreatePolicyBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  category: RetentionCategorySchema,
  retentionDays: z.number().int().min(0),
  action: RetentionActionSchema,
  legalHoldEligible: z.boolean().default(true),
  enabled: z.boolean().default(true),
});
export type CreatePolicyBody = z.infer<typeof CreatePolicyBodySchema>;

export const UpdatePolicyBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  retentionDays: z.number().int().min(0).optional(),
  action: RetentionActionSchema.optional(),
  legalHoldEligible: z.boolean().optional(),
  enabled: z.boolean().optional(),
});
export type UpdatePolicyBody = z.infer<typeof UpdatePolicyBodySchema>;

export const PolicyParamsSchema = z.object({ id: z.string().min(1) });
export type PolicyParams = z.infer<typeof PolicyParamsSchema>;

export const ListPoliciesQuerySchema = z.object({
  category: RetentionCategorySchema.optional(),
});
export type ListPoliciesQuery = z.infer<typeof ListPoliciesQuerySchema>;

export const CreateLegalHoldBodySchema = z.object({
  reason: z.string().min(1),
  placedBy: z.string().min(1),
  categories: z.array(z.string()).min(1),
  recordIds: z.array(z.string()).default([]),
  expiresAt: z.string().nullable().optional(),
});
export type CreateLegalHoldBody = z.infer<typeof CreateLegalHoldBodySchema>;

export const LegalHoldParamsSchema = z.object({ id: z.string().min(1) });
export type LegalHoldParams = z.infer<typeof LegalHoldParamsSchema>;

export const ListLegalHoldsQuerySchema = z.object({
  status: LegalHoldStatusSchema.optional(),
});
export type ListLegalHoldsQuery = z.infer<typeof ListLegalHoldsQuerySchema>;

export const EvaluateRecordsBodySchema = z.object({
  records: z
    .array(
      z.object({
        id: z.string().min(1),
        category: RetentionCategorySchema,
        createdAt: z.string(),
        anchorAt: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .min(1),
});
export type EvaluateRecordsBody = z.infer<typeof EvaluateRecordsBodySchema>;
