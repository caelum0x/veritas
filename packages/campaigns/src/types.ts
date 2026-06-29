// Shared type definitions for the campaigns module.

import { z } from "zod";

export const CampaignStatusSchema = z.enum([
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignChannelSchema = z.enum(["email", "webhook", "in_app"]);
export type CampaignChannel = z.infer<typeof CampaignChannelSchema>;

export const AudienceFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;

export const MessageVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  html: z.string().optional(),
  weight: z.number().min(0).max(100).default(50),
});
export type MessageVariant = z.infer<typeof MessageVariantSchema>;

export const TriggerTypeSchema = z.enum([
  "immediate",
  "scheduled",
  "event",
  "api",
]);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const MetricEventSchema = z.object({
  campaignId: z.string().min(1),
  recipientId: z.string().min(1),
  variantId: z.string().optional(),
  event: z.enum(["sent", "delivered", "opened", "clicked", "unsubscribed", "bounced"]),
  occurredAt: z.string().datetime(),
  meta: z.record(z.string()).optional(),
});
export type MetricEvent = z.infer<typeof MetricEventSchema>;
