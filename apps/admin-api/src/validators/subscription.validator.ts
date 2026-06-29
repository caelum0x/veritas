// Zod validators for subscription admin endpoints
import { z } from "zod";

export const listSubscriptionsSchema = z.object({
  organizationId: z.string().optional(),
  planId: z.string().optional(),
  status: z.enum(["active", "canceled", "past_due", "trialing", "unpaid"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getSubscriptionSchema = z.object({
  id: z.string().min(1),
});

export const createSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  interval: z.enum(["monthly", "annual"]),
  trialDays: z.number().int().min(0).max(365).optional(),
  metadata: z.record(z.string()).optional(),
});

export const updateSubscriptionSchema = z.object({
  planId: z.string().min(1).optional(),
  status: z.enum(["active", "canceled", "past_due", "trialing", "unpaid"]).optional(),
  metadata: z.record(z.string()).optional(),
});

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export type ListSubscriptionsInput = z.infer<typeof listSubscriptionsSchema>;
export type GetSubscriptionInput = z.infer<typeof getSubscriptionSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
