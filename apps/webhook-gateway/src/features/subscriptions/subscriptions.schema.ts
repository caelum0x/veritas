// Zod schemas for subscription management API request/response validation.

import { z } from "zod";
import { ALL_WEBHOOK_EVENT_TYPES } from "@veritas/webhooks";

const webhookEventTypeEnum = z.enum(
  ALL_WEBHOOK_EVENT_TYPES as [string, ...string[]],
);

/** POST /subscriptions body */
export const CreateSubscriptionBodySchema = z.object({
  organizationId: z.string().min(1),
  url: z.string().url("Must be a valid HTTPS URL"),
  secret: z.string().min(8, "Secret must be at least 8 characters"),
  eventTypes: z
    .array(webhookEventTypeEnum)
    .min(1, "At least one event type is required"),
});
export type CreateSubscriptionBody = z.infer<typeof CreateSubscriptionBodySchema>;

/** PATCH /subscriptions/:id body */
export const UpdateSubscriptionBodySchema = z.object({
  url: z.string().url().optional(),
  secret: z.string().min(8).optional(),
  eventTypes: z.array(webhookEventTypeEnum).min(1).optional(),
  active: z.boolean().optional(),
});
export type UpdateSubscriptionBody = z.infer<typeof UpdateSubscriptionBodySchema>;

/** Route params containing a subscription id */
export const SubscriptionIdParamsSchema = z.object({
  id: z.string().min(1, "Subscription ID is required"),
});
export type SubscriptionIdParams = z.infer<typeof SubscriptionIdParamsSchema>;

/** Query params for list endpoint */
export const ListSubscriptionsQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
});
export type ListSubscriptionsQuery = z.infer<typeof ListSubscriptionsQuerySchema>;
