// WebhookEvent envelope and related types for the webhooks package.

import { z } from "zod";
import { IsoTimestamp, Id } from "@veritas/core";

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string() as unknown as z.ZodType<IsoTimestamp>,
  version: z.literal("1"),
  deliveryId: z.string(),
  subscriptionId: z.string(),
  attempt: z.number().int().min(1),
  payload: z.record(z.unknown()),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export interface WebhookEventOptions {
  type: string;
  subscriptionId: string;
  deliveryId: string;
  payload: Record<string, unknown>;
  attempt?: number;
}

export function makeWebhookEvent(opts: WebhookEventOptions, id: string, timestamp: IsoTimestamp): WebhookEvent {
  return {
    id,
    type: opts.type,
    timestamp,
    version: "1",
    deliveryId: opts.deliveryId,
    subscriptionId: opts.subscriptionId,
    attempt: opts.attempt ?? 1,
    payload: opts.payload,
  };
}

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  eventTypes: string[];
  active: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface DeliveryRecord {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: string;
  attempt: number;
  statusCode: number | null;
  success: boolean;
  responseBody: string | null;
  error: string | null;
  deliveredAt: IsoTimestamp | null;
  nextRetryAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
}
