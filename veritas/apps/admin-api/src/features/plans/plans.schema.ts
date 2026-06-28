// Zod validation schemas for the plans feature HTTP endpoints.
import { z } from "zod";
import { BillingIntervalSchema, CreatePlanSchema, UpdatePlanSchema } from "@veritas/contracts";

export const listPlansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
  interval: BillingIntervalSchema.optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;

export const planIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type PlanIdParams = z.infer<typeof planIdParamsSchema>;

export const createPlanBodySchema = CreatePlanSchema;
export type CreatePlanBody = z.infer<typeof createPlanBodySchema>;

export const updatePlanBodySchema = UpdatePlanSchema;
export type UpdatePlanBody = z.infer<typeof updatePlanBodySchema>;

export const planSlugParamsSchema = z.object({
  slug: z.string().min(1),
});
export type PlanSlugParams = z.infer<typeof planSlugParamsSchema>;
