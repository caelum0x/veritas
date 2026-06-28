// Zod validators for subscription request bodies and query params
import { z } from "zod";
import {
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  SubscriptionStatusSchema,
} from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createSubscriptionBodySchema = CreateSubscriptionSchema;

export const updateSubscriptionBodySchema = UpdateSubscriptionSchema;

export const listSubscriptionsQuerySchema = paginationSchema.extend({
  status: SubscriptionStatusSchema.optional(),
  planId: z.string().optional(),
  organizationId: z.string().optional(),
});

export const subscriptionIdParamSchema = z.object({
  id: z.string().min(1, "Subscription ID is required"),
});

export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;
export type UpdateSubscriptionBody = z.infer<typeof updateSubscriptionBodySchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
export type SubscriptionIdParam = z.infer<typeof subscriptionIdParamSchema>;
