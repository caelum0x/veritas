// Shared types for the recommendations module.

import { z } from "zod";

export const RecommendationContextSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  excludeIds: z.array(z.string()).default([]),
  filters: z.record(z.unknown()).default({}),
});
export type RecommendationContext = z.infer<typeof RecommendationContextSchema>;

export const RecommendationSchema = z.object({
  itemId: z.string().min(1),
  score: z.number().min(0).max(1),
  reason: z.string().min(1),
  strategy: z.string().min(1),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecommendationResultSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  totalCandidates: z.number().int().min(0),
  strategy: z.string().min(1),
  generatedAt: z.string().datetime(),
});
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;

export const FeedbackKindSchema = z.enum(["click", "accept", "reject", "ignore"]);
export type FeedbackKind = z.infer<typeof FeedbackKindSchema>;

export const FeedbackSchema = z.object({
  userId: z.string().min(1),
  itemId: z.string().min(1),
  kind: FeedbackKindSchema,
  score: z.number().min(0).max(1).optional(),
  recordedAt: z.string().datetime(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const SimilarityResultSchema = z.object({
  itemId: z.string().min(1),
  similarity: z.number().min(0).max(1),
});
export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;

export const RankedCandidateSchema = z.object({
  itemId: z.string().min(1),
  rawScore: z.number(),
  normalizedScore: z.number().min(0).max(1),
  boostFactor: z.number().min(0).default(1),
  finalScore: z.number().min(0).max(1),
  reason: z.string().min(1),
});
export type RankedCandidate = z.infer<typeof RankedCandidateSchema>;
