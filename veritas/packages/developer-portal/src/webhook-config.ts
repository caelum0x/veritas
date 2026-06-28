// Developer portal webhook configuration — per-app event delivery settings
import { z } from "zod";
import { newId, type IsoTimestamp } from "@veritas/core";
import { urlSchema, nonEmptyString, metadataSchema, timestampsSchema } from "@veritas/contracts";

export const WebhookEventTypeSchema = z.enum([
  "claim.created",
  "claim.updated",
  "verification.completed",
  "verification.failed",
  "order.created",
  "order.settled",
  "source.verified",
  "source.rejected",
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const WebhookConfigStatusSchema = z.enum(["active", "disabled", "failed"]);
export type WebhookConfigStatus = z.infer<typeof WebhookConfigStatusSchema>;

export const WebhookConfigSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: nonEmptyString,
  url: urlSchema,
  secret: z.string().min(16),
  events: z.array(WebhookEventTypeSchema).min(1),
  status: WebhookConfigStatusSchema,
  failureCount: z.number().int().min(0).default(0),
  lastDeliveredAt: z.string().nullable().default(null),
  metadata: metadataSchema,
  timestamps: timestampsSchema,
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export const CreateWebhookConfigSchema = WebhookConfigSchema.omit({
  id: true,
  status: true,
  failureCount: true,
  lastDeliveredAt: true,
  timestamps: true,
}).extend({
  metadata: metadataSchema.default({}),
});

export type CreateWebhookConfig = z.infer<typeof CreateWebhookConfigSchema>;

export const UpdateWebhookConfigSchema = z.object({
  name: nonEmptyString.optional(),
  url: urlSchema.optional(),
  secret: z.string().min(16).optional(),
  events: z.array(WebhookEventTypeSchema).min(1).optional(),
  metadata: metadataSchema.optional(),
});

export type UpdateWebhookConfig = z.infer<typeof UpdateWebhookConfigSchema>;

const MAX_FAILURES = 5;

export function createWebhookConfig(input: CreateWebhookConfig, now: IsoTimestamp): WebhookConfig {
  return {
    ...input,
    id: newId("webhook"),
    status: "active",
    failureCount: 0,
    lastDeliveredAt: null,
    timestamps: { createdAt: now, updatedAt: now },
  };
}

export function updateWebhookConfig(config: WebhookConfig, patch: UpdateWebhookConfig, now: IsoTimestamp): WebhookConfig {
  return { ...config, ...patch, timestamps: { ...config.timestamps, updatedAt: now } };
}

export function disableWebhook(config: WebhookConfig, now: IsoTimestamp): WebhookConfig {
  return { ...config, status: "disabled", timestamps: { ...config.timestamps, updatedAt: now } };
}

export function enableWebhook(config: WebhookConfig, now: IsoTimestamp): WebhookConfig {
  return { ...config, status: "active", failureCount: 0, timestamps: { ...config.timestamps, updatedAt: now } };
}

export function recordDeliverySuccess(config: WebhookConfig, now: IsoTimestamp): WebhookConfig {
  return { ...config, failureCount: 0, lastDeliveredAt: now, timestamps: { ...config.timestamps, updatedAt: now } };
}

export function recordDeliveryFailure(config: WebhookConfig, now: IsoTimestamp): WebhookConfig {
  const failureCount = config.failureCount + 1;
  const status: WebhookConfigStatus = failureCount >= MAX_FAILURES ? "failed" : config.status;
  return { ...config, failureCount, status, timestamps: { ...config.timestamps, updatedAt: now } };
}
