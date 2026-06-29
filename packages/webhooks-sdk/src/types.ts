// Shared type definitions for the webhooks-sdk package.

import { z } from "zod";
import { IsoTimestamp } from "@veritas/core";

export const WebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  timestamp: z.string() as unknown as z.ZodType<IsoTimestamp>,
  version: z.literal("1"),
  deliveryId: z.string().min(1),
  subscriptionId: z.string().min(1),
  attempt: z.number().int().min(1),
  payload: z.record(z.unknown()),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export interface WebhookClientConfig {
  /** Base URL of the Veritas API. */
  baseUrl: string;
  /** API key for authentication. */
  apiKey: string;
  /** Request timeout in milliseconds. Default: 10_000. */
  timeoutMs?: number;
}

export interface ListDeliveriesOptions {
  subscriptionId?: string;
  eventType?: string;
  success?: boolean;
  limit?: number;
  cursor?: string;
}

export interface DeliveryView {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: string;
  attempt: number;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  deliveredAt: IsoTimestamp | null;
  nextRetryAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
}

export interface ReplayGuardEntry {
  eventId: string;
  processedAt: IsoTimestamp;
}
