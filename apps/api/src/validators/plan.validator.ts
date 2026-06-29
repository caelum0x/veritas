// Zod validators for plan request bodies and query params.
import { z } from "zod";
import { paginationSchema, nonEmptyString, moneySchema } from "@veritas/contracts";

export const listPlansQuerySchema = z.object({
  ...paginationSchema.shape,
  active: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  interval: z.enum(["month", "year"]).optional(),
});

export const getPlanParamsSchema = z.object({
  id: z.string().min(1),
});

export const createPlanBodySchema = z.object({
  name: nonEmptyString,
  description: z.string().optional(),
  priceUsdc: moneySchema,
  interval: z.enum(["month", "year"]),
  verificationQuota: z.number().int().positive(),
  apiCallQuota: z.number().int().positive(),
  features: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  metadata: z.record(z.string()).optional(),
});

export const updatePlanParamsSchema = z.object({
  id: z.string().min(1),
});

export const updatePlanBodySchema = z.object({
  name: nonEmptyString.optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
});

export const deletePlanParamsSchema = z.object({
  id: z.string().min(1),
});

export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type GetPlanParams = z.infer<typeof getPlanParamsSchema>;
export type CreatePlanBody = z.infer<typeof createPlanBodySchema>;
export type UpdatePlanParams = z.infer<typeof updatePlanParamsSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanBodySchema>;
export type DeletePlanParams = z.infer<typeof deletePlanParamsSchema>;
