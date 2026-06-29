// Input/output DTOs for plan use-cases.
import { z } from "zod";
import {
  PlanSchema,
  CreatePlanSchema,
  UpdatePlanSchema,
  BillingIntervalSchema,
} from "@veritas/contracts";

/** Input DTO for creating a new billing plan. */
export const CreatePlanInputSchema = CreatePlanSchema;
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;

/** Input DTO for applying partial updates to a plan. */
export const UpdatePlanInputSchema = UpdatePlanSchema;
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;

/** Input DTO for fetching a single plan by ID. */
export const GetPlanInputSchema = z.object({
  planId: z.string().min(1),
});
export type GetPlanInput = z.infer<typeof GetPlanInputSchema>;

/** Input DTO for fetching a plan by its unique slug. */
export const GetPlanBySlugInputSchema = z.object({
  slug: z.string().min(1),
});
export type GetPlanBySlugInput = z.infer<typeof GetPlanBySlugInputSchema>;

/** Query parameters for listing plans. */
export const ListPlansInputSchema = z.object({
  interval: BillingIntervalSchema.optional(),
  active: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListPlansInput = z.infer<typeof ListPlansInputSchema>;

/** Output DTO representing a single billing plan. */
export const PlanOutputSchema = PlanSchema;
export type PlanOutput = z.infer<typeof PlanOutputSchema>;

/** Output DTO for paginated plan lists. */
export const PlanListOutputSchema = z.object({
  items: z.array(PlanSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type PlanListOutput = z.infer<typeof PlanListOutputSchema>;
