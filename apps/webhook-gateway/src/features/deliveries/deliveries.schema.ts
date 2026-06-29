// Zod validation schemas for deliveries feature request/response shapes.

import { z } from "zod";

export const DeliveryIdParamSchema = z.object({
  deliveryId: z.string().min(1, "deliveryId is required"),
});
export type DeliveryIdParam = z.infer<typeof DeliveryIdParamSchema>;

export const SubscriptionIdParamSchema = z.object({
  subscriptionId: z.string().min(1, "subscriptionId is required"),
});
export type SubscriptionIdParam = z.infer<typeof SubscriptionIdParamSchema>;

export const ListDeliveriesQuerySchema = z.object({
  subscriptionId: z.string().min(1),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 50))
    .pipe(z.number().int().min(1).max(200)),
});
export type ListDeliveriesQuery = z.infer<typeof ListDeliveriesQuerySchema>;

export const RetryDeliveryBodySchema = z.object({
  deliveryId: z.string().min(1),
});
export type RetryDeliveryBody = z.infer<typeof RetryDeliveryBodySchema>;

export const DeliveryResponseSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  attempt: z.number().int(),
  statusCode: z.number().int().nullable(),
  success: z.boolean(),
  responseBody: z.string().nullable(),
  error: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  nextRetryAt: z.string().nullable(),
  createdAt: z.string(),
});
export type DeliveryResponse = z.infer<typeof DeliveryResponseSchema>;
