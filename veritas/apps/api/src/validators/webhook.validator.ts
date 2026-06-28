// Zod validators for webhook request bodies and query params
import { z } from "zod";
import {
  CreateWebhookSchema,
  UpdateWebhookSchema,
} from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createWebhookBodySchema = CreateWebhookSchema;

export const updateWebhookBodySchema = UpdateWebhookSchema;

export const listWebhooksQuerySchema = paginationSchema.extend({
  organizationId: z.string().optional(),
  active: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export const webhookIdParamSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
});

export const webhookDeliveryIdParamSchema = z.object({
  id: z.string().min(1, "Webhook ID is required"),
  deliveryId: z.string().min(1, "Delivery ID is required"),
});

export type CreateWebhookBody = z.infer<typeof createWebhookBodySchema>;
export type UpdateWebhookBody = z.infer<typeof updateWebhookBodySchema>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;
export type WebhookIdParam = z.infer<typeof webhookIdParamSchema>;
export type WebhookDeliveryIdParam = z.infer<typeof webhookDeliveryIdParamSchema>;
