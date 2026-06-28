// Webhooks resource client for managing webhook endpoints and deliveries.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  WebhookSchema,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  WebhookDeliverySchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Webhook = z.infer<typeof WebhookSchema>;
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

export interface ListWebhooksParams {
  limit?: number;
  cursor?: string;
}

export interface ListWebhookDeliveriesParams {
  limit?: number;
  cursor?: string;
  status?: string;
}

export class WebhooksResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Create a new webhook endpoint. */
  async create(data: CreateWebhook): Promise<ApiResponse<Webhook>> {
    const body = CreateWebhookSchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: "/webhooks",
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Webhook>;
    throw result.error;
  }

  /** Retrieve a single webhook by ID. */
  async get(webhookId: string): Promise<ApiResponse<Webhook>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/webhooks/${encodeURIComponent(webhookId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<Webhook>;
    throw result.error;
  }

  /** Update an existing webhook endpoint. */
  async update(webhookId: string, data: UpdateWebhook): Promise<ApiResponse<Webhook>> {
    const body = UpdateWebhookSchema.parse(data);
    const result = await this.transport.request({
      method: "PATCH",
      path: `/webhooks/${encodeURIComponent(webhookId)}`,
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Webhook>;
    throw result.error;
  }

  /** Delete a webhook endpoint. */
  async delete(webhookId: string): Promise<ApiResponse<null>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/webhooks/${encodeURIComponent(webhookId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<null>;
    throw result.error;
  }

  /** List all webhook endpoints. */
  async list(params?: ListWebhooksParams): Promise<ApiPage<Webhook>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    const result = await this.transport.request({
      method: "GET",
      path: "/webhooks",
      query,
    });
    if (result.ok) return result.value.body as ApiPage<Webhook>;
    throw result.error;
  }

  /** List deliveries for a specific webhook. */
  async listDeliveries(
    webhookId: string,
    params?: ListWebhookDeliveriesParams,
  ): Promise<ApiPage<WebhookDelivery>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    if (params?.status) query["status"] = params.status;
    const result = await this.transport.request({
      method: "GET",
      path: `/webhooks/${encodeURIComponent(webhookId)}/deliveries`,
      query,
    });
    if (result.ok) return result.value.body as ApiPage<WebhookDelivery>;
    throw result.error;
  }

  /** Retrieve a single webhook delivery by ID. */
  async getDelivery(
    webhookId: string,
    deliveryId: string,
  ): Promise<ApiResponse<WebhookDelivery>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<WebhookDelivery>;
    throw result.error;
  }

  /** Redeliver a previously failed webhook delivery. */
  async redeliver(
    webhookId: string,
    deliveryId: string,
  ): Promise<ApiResponse<WebhookDelivery>> {
    const result = await this.transport.request({
      method: "POST",
      path: `/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver`,
    });
    if (result.ok) return result.value.body as ApiResponse<WebhookDelivery>;
    throw result.error;
  }
}
