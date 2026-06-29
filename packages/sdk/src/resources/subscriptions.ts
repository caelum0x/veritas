// Subscriptions resource client: create, update, and cancel billing subscriptions.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, interpolatePath, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import { SubscriptionSchema, CreateSubscriptionSchema, UpdateSubscriptionSchema } from "@veritas/contracts";

export type Subscription = z.infer<typeof SubscriptionSchema>;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

export interface ListSubscriptionsParams {
  organizationId?: string;
  status?: string;
  planId?: string;
  page?: number;
  limit?: number;
}

export class SubscriptionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const req = buildRequest({ method: "POST", path: "/subscriptions", body: input }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Subscription data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async get(subscriptionId: string): Promise<Subscription> {
    const path = interpolatePath("/subscriptions/:subscriptionId", { subscriptionId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Subscription not found in response", code: "not_found", status: result.value.status });
    }
    throw result.error;
  }

  async list(params?: ListSubscriptionsParams): Promise<Subscription[]> {
    const query = toQueryParams({
      organizationId: params?.organizationId,
      status: params?.status,
      planId: params?.planId,
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/subscriptions", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async update(subscriptionId: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    const path = interpolatePath("/subscriptions/:subscriptionId", { subscriptionId });
    const req = buildRequest({ method: "PATCH", path, body: input }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Updated subscription data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async cancel(subscriptionId: string, opts?: { immediately?: boolean }): Promise<Subscription> {
    const path = interpolatePath("/subscriptions/:subscriptionId/cancel", { subscriptionId });
    const req = buildRequest({ method: "POST", path, body: { immediately: opts?.immediately ?? false } }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Cancelled subscription data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async resume(subscriptionId: string): Promise<Subscription> {
    const path = interpolatePath("/subscriptions/:subscriptionId/resume", { subscriptionId });
    const req = buildRequest({ method: "POST", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Subscription>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Resumed subscription data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }
}
