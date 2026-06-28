// HTTP client for managing webhook subscriptions and deliveries via the Veritas API.

import { Result, ok, err, type Page } from "@veritas/core";
import type { WebhookClientConfig, ListDeliveriesOptions, DeliveryView } from "./types.js";
import { toDeliveryView, type RawDeliveryRecord } from "./retry.js";
import { WebhookClientError } from "./errors.js";

export interface CreateSubscriptionRequest {
  url: string;
  secret: string;
  eventTypes: string[];
  description?: string;
}

export interface UpdateSubscriptionRequest {
  url?: string;
  secret?: string;
  eventTypes?: string[];
  active?: boolean;
  description?: string;
}

export interface SubscriptionResponse {
  id: string;
  organizationId: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Thin HTTP client for the Veritas webhooks REST API. No real network in this module. */
export class WebhooksClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: WebhookClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Result<T, WebhookClientError>> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        return err(new WebhookClientError(`API error ${res.status}: ${text}`, res.status));
      }

      const data = (await res.json()) as T;
      return ok(data);
    } catch (e: unknown) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        return err(new WebhookClientError(`Request timed out after ${this.timeoutMs}ms`));
      }
      const msg = e instanceof Error ? e.message : String(e);
      return err(new WebhookClientError(msg));
    }
  }

  /** Create a new webhook subscription. */
  async createSubscription(
    req: CreateSubscriptionRequest,
  ): Promise<Result<SubscriptionResponse, WebhookClientError>> {
    return this.request<SubscriptionResponse>("POST", "/v1/webhooks/subscriptions", req);
  }

  /** Update an existing webhook subscription. */
  async updateSubscription(
    id: string,
    req: UpdateSubscriptionRequest,
  ): Promise<Result<SubscriptionResponse, WebhookClientError>> {
    return this.request<SubscriptionResponse>("PATCH", `/v1/webhooks/subscriptions/${id}`, req);
  }

  /** Delete a webhook subscription. */
  async deleteSubscription(
    id: string,
  ): Promise<Result<void, WebhookClientError>> {
    return this.request<void>("DELETE", `/v1/webhooks/subscriptions/${id}`);
  }

  /** Get a webhook subscription by ID. */
  async getSubscription(
    id: string,
  ): Promise<Result<SubscriptionResponse, WebhookClientError>> {
    return this.request<SubscriptionResponse>("GET", `/v1/webhooks/subscriptions/${id}`);
  }

  /** List all webhook subscriptions for the authenticated organization. */
  async listSubscriptions(): Promise<Result<SubscriptionResponse[], WebhookClientError>> {
    return this.request<SubscriptionResponse[]>("GET", "/v1/webhooks/subscriptions");
  }

  /** List webhook delivery records with optional filters. */
  async listDeliveries(
    opts: ListDeliveriesOptions = {},
  ): Promise<Result<DeliveryView[], WebhookClientError>> {
    const params = new URLSearchParams();
    if (opts.subscriptionId) params.set("subscriptionId", opts.subscriptionId);
    if (opts.eventType) params.set("eventType", opts.eventType);
    if (opts.success !== undefined) params.set("success", String(opts.success));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);

    const qs = params.size > 0 ? `?${params.toString()}` : "";
    const result = await this.request<RawDeliveryRecord[]>("GET", `/v1/webhooks/deliveries${qs}`);

    if (!result.ok) return result;
    return ok(result.value.map(toDeliveryView));
  }

  /** Replay a specific delivery attempt by delivery ID. */
  async replayDelivery(
    deliveryId: string,
  ): Promise<Result<DeliveryView, WebhookClientError>> {
    const result = await this.request<RawDeliveryRecord>(
      "POST",
      `/v1/webhooks/deliveries/${deliveryId}/replay`,
    );
    if (!result.ok) return result;
    return ok(toDeliveryView(result.value));
  }
}

/** Create a new WebhooksClient from the provided config. */
export function createWebhooksClient(config: WebhookClientConfig): WebhooksClient {
  return new WebhooksClient(config);
}
