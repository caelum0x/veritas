// Zod request/response schemas for the routing feature endpoints.
import { z } from "zod";
import { ClaimDomainSchema } from "@veritas/verifier-kit";

export const RouteClaimBodySchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(8000),
  domain: ClaimDomainSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type RouteClaimBody = z.infer<typeof RouteClaimBodySchema>;

export const RouteClaimParamsSchema = z.object({});
export const RouteClaimQuerySchema = z.object({});

export const VerificationPlanResponseSchema = z.object({
  claimId: z.string(),
  claimText: z.string(),
  domain: z.string(),
  claimType: z.string(),
  classificationConfidence: z.number(),
  verifierIds: z.array(z.string()),
  createdAt: z.string(),
});
export type VerificationPlanResponse = z.infer<typeof VerificationPlanResponseSchema>;

export const MergedResultResponseSchema = z.object({
  claimId: z.string(),
  domain: z.string(),
  aggregated: z.object({
    verdict: z.string(),
    score: z.number(),
    confidence: z.string(),
    signalCount: z.number(),
    aggregatedAt: z.string(),
  }),
  signals: z.array(
    z.object({
      verifierId: z.string(),
      verdict: z.string(),
      confidence: z.string(),
      weight: z.number(),
      rationale: z.string().optional(),
    }),
  ),
  verifierIds: z.array(z.string()),
  mergedAt: z.string(),
});
export type MergedResultResponse = z.infer<typeof MergedResultResponseSchema>;

export const PreviewPlanBodySchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(8000),
  domain: ClaimDomainSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type PreviewPlanBody = z.infer<typeof PreviewPlanBodySchema>;
