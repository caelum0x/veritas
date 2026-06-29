// Zod schemas for webhook HTTP request validation (body, query, params).
import { z } from "zod";
import { CreateWebhookSchema, UpdateWebhookSchema } from "@veritas/contracts";

export const createWebhookBodySchema = CreateWebhookSchema;
export type CreateWebhookBody = z.infer<typeof createWebhookBodySchema>;

export const updateWebhookBodySchema = UpdateWebhookSchema;
export type UpdateWebhookBody = z.infer<typeof updateWebhookBodySchema>;

export const listWebhooksQuerySchema = z.object({
  enabled: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;

export const webhookIdParamSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
});
export type WebhookIdParam = z.infer<typeof webhookIdParamSchema>;

export const webhookDeliveryIdParamSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
  deliveryId: z.string().min(1, "Delivery ID is required"),
});
export type WebhookDeliveryIdParam = z.infer<typeof webhookDeliveryIdParamSchema>;

export const listDeliveriesQuerySchema = z.object({
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "RETRYING"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
