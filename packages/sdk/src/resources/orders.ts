// Orders resource client for placing and tracking USDC-settled CAP verification orders.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { OrderSchema, CreateOrderSchema, UpdateOrderSchema } from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;

export interface ListOrdersParams {
  serviceId?: string;
  agentId?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export class OrdersResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Retrieve a single order by ID. */
  async get(orderId: string): Promise<ApiResponse<Order>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/orders/${encodeURIComponent(orderId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Order>;
    }
    throw result.error;
  }

  /** List orders with optional filtering by service, agent, or status. */
  async list(params?: ListOrdersParams): Promise<ApiPage<Order>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.serviceId) query["serviceId"] = params.serviceId;
    if (params?.agentId) query["agentId"] = params.agentId;
    if (params?.status) query["status"] = params.status;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;

    const result = await this.transport.request({
      method: "GET",
      path: "/orders",
      query,
    });

    if (result.ok) {
      return result.value.body as ApiPage<Order>;
    }
    throw result.error;
  }

  /** Place a new order for a verification service (initiates CAP negotiation). */
  async create(data: CreateOrder, idempotencyKey?: string): Promise<ApiResponse<Order>> {
    const body = CreateOrderSchema.parse(data);

    const result = await this.transport.request({
      method: "POST",
      path: "/orders",
      body,
      idempotencyKey,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Order>;
    }
    throw result.error;
  }

  /** Update order metadata or status (e.g., cancel). */
  async update(orderId: string, data: UpdateOrder): Promise<ApiResponse<Order>> {
    const body = UpdateOrderSchema.parse(data);

    const result = await this.transport.request({
      method: "PATCH",
      path: `/orders/${encodeURIComponent(orderId)}`,
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Order>;
    }
    throw result.error;
  }

  /** Cancel an order that has not yet been fulfilled. */
  async cancel(orderId: string): Promise<ApiResponse<Order>> {
    const result = await this.transport.request({
      method: "POST",
      path: `/orders/${encodeURIComponent(orderId)}/cancel`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Order>;
    }
    throw result.error;
  }
}
