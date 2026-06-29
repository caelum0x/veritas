// Subscription entity: an organization's active enrollment in a billing plan.

import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

export const SubscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z
  .object({
    id: idSchema("sub"),
    organizationId: idSchema("org"),
    planId: idSchema("plan"),
    status: SubscriptionStatusSchema,
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    cancelAtPeriodEnd: z.boolean(),
    cancelledAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CreateSubscriptionSchema = z.object({
  organizationId: idSchema("org"),
  planId: idSchema("plan"),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
});
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = z.object({
  status: SubscriptionStatusSchema.optional(),
  planId: idSchema("plan").optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  cancelledAt: z.string().nullable().optional(),
});
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;
