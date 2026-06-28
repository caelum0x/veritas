// Services resource client for managing verification service offerings on the marketplace.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { ServiceSchema, CreateServiceSchema, UpdateServiceSchema } from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Service = z.infer<typeof ServiceSchema>;
export type CreateService = z.infer<typeof CreateServiceSchema>;
export type UpdateService = z.infer<typeof UpdateServiceSchema>;

export interface ListServicesParams {
  agentId?: string;
  limit?: number;
  cursor?: string;
}

export class ServicesResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Retrieve a single service by ID. */
  async get(serviceId: string): Promise<ApiResponse<Service>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/services/${encodeURIComponent(serviceId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Service>;
    }
    throw result.error;
  }

  /** List available services, optionally filtered by agent. */
  async list(params?: ListServicesParams): Promise<ApiPage<Service>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.agentId) query["agentId"] = params.agentId;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;

    const result = await this.transport.request({
      method: "GET",
      path: "/services",
      query,
    });

    if (result.ok) {
      return result.value.body as ApiPage<Service>;
    }
    throw result.error;
  }

  /** Create a new service offering. */
  async create(data: CreateService): Promise<ApiResponse<Service>> {
    const body = CreateServiceSchema.parse(data);

    const result = await this.transport.request({
      method: "POST",
      path: "/services",
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Service>;
    }
    throw result.error;
  }

  /** Update an existing service offering. */
  async update(serviceId: string, data: UpdateService): Promise<ApiResponse<Service>> {
    const body = UpdateServiceSchema.parse(data);

    const result = await this.transport.request({
      method: "PATCH",
      path: `/services/${encodeURIComponent(serviceId)}`,
      body,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<Service>;
    }
    throw result.error;
  }

  /** Remove a service offering. */
  async delete(serviceId: string): Promise<ApiResponse<void>> {
    const result = await this.transport.request({
      method: "DELETE",
      path: `/services/${encodeURIComponent(serviceId)}`,
    });

    if (result.ok) {
      return result.value.body as ApiResponse<void>;
    }
    throw result.error;
  }
}
