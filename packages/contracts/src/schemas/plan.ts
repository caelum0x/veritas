// Plan entity: a subscription tier with quotas and recurring price.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const BillingIntervalSchema = z.enum(["MONTHLY", "YEARLY"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const PlanSchema = z
  .object({
    id: idSchema("plan"),
    slug: z.string(),
    name: z.string(),
    price: moneySchema,
    interval: BillingIntervalSchema,
    includedVerifications: z.number().int().min(0),
    overagePrice: moneySchema.nullable(),
    active: z.boolean(),
  })
  .merge(timestampsSchema);
export type Plan = z.infer<typeof PlanSchema>;

export const CreatePlanSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: moneySchema,
  interval: BillingIntervalSchema,
  includedVerifications: z.number().int().min(0),
  overagePrice: moneySchema.nullable().optional(),
  active: z.boolean().optional(),
});
export type CreatePlan = z.infer<typeof CreatePlanSchema>;

export const UpdatePlanSchema = CreatePlanSchema.partial();
export type UpdatePlan = z.infer<typeof UpdatePlanSchema>;
