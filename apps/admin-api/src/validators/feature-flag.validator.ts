// Zod validators for feature-flag admin endpoints
import { z } from "zod";

export const listFeatureFlagsSchema = z.object({
  tenantId: z.string().optional(),
  organizationId: z.string().optional(),
  enabled: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getFeatureFlagSchema = z.object({
  id: z.string().min(1),
});

export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_.-]+$/, "Key must be lowercase alphanumeric with underscores, dots, or dashes"),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(false),
  tenantId: z.string().optional(),
  organizationId: z.string().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  conditions: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  conditions: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const featureFlagIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ListFeatureFlagsInput = z.infer<typeof listFeatureFlagsSchema>;
export type GetFeatureFlagInput = z.infer<typeof getFeatureFlagSchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>;
export type FeatureFlagIdParam = z.infer<typeof featureFlagIdParamSchema>;
