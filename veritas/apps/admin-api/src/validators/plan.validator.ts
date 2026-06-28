// Zod validators for plan admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

const billingIntervalSchema = z.enum(["monthly", "yearly", "one_time"]);

const planFeaturesSchema = z.object({
  maxUsers: z.number().int().min(0).optional(),
  maxOrganizations: z.number().int().min(0).optional(),
  maxClaims: z.number().int().min(0).optional(),
  maxApiKeys: z.number().int().min(0).optional(),
  customDomain: z.boolean().optional(),
  ssoEnabled: z.boolean().optional(),
  auditLogsRetentionDays: z.number().int().min(0).optional(),
}).passthrough();

export const listPlansSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    billingInterval: billingIntervalSchema.optional(),
  }),
});

export const getPlanSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    priceUsdc: z.number().int().min(0),
    billingInterval: billingIntervalSchema,
    isActive: z.boolean().default(true),
    trialDays: z.number().int().min(0).optional(),
    features: planFeaturesSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    priceUsdc: z.number().int().min(0).optional(),
    billingInterval: billingIntervalSchema.optional(),
    isActive: z.boolean().optional(),
    trialDays: z.number().int().min(0).optional(),
    features: planFeaturesSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const deletePlanSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listPlanSubscriptionsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: paginationSchema,
});

export type ListPlansInput = z.infer<typeof listPlansSchema>;
export type GetPlanInput = z.infer<typeof getPlanSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type DeletePlanInput = z.infer<typeof deletePlanSchema>;
export type ListPlanSubscriptionsInput = z.infer<typeof listPlanSubscriptionsSchema>;
