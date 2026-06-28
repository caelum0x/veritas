// Shared types and schemas for @veritas/ml-scoring: predictions, explanations, and model metadata.
import { z } from "zod";
import { scoreSchema, isoTimestampSchema } from "@veritas/core";

export const predictionSchema = z.object({
  entityId: z.string().min(1),
  modelId: z.string().min(1),
  score: scoreSchema,
  confidence: scoreSchema,
  label: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: isoTimestampSchema,
});
export type Prediction = z.infer<typeof predictionSchema>;

export const featureImportanceSchema = z.object({
  featureName: z.string().min(1),
  importance: z.number(),
  direction: z.enum(["positive", "negative", "neutral"]),
});
export type FeatureImportance = z.infer<typeof featureImportanceSchema>;

export const explanationSchema = z.object({
  entityId: z.string().min(1),
  modelId: z.string().min(1),
  score: scoreSchema,
  featureImportances: z.array(featureImportanceSchema),
  baselineScore: scoreSchema,
  timestamp: isoTimestampSchema,
});
export type Explanation = z.infer<typeof explanationSchema>;

export const modelMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string(),
  featureNames: z.array(z.string()),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ModelMetadata = z.infer<typeof modelMetadataSchema>;

export const ensembleWeightSchema = z.object({
  modelId: z.string().min(1),
  weight: z.number().min(0).max(1),
});
export type EnsembleWeight = z.infer<typeof ensembleWeightSchema>;

export const scoringContextSchema = z.object({
  requestId: z.string().min(1),
  callerId: z.string().optional(),
  timeout: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ScoringContext = z.infer<typeof scoringContextSchema>;
