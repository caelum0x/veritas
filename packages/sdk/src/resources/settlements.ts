// Settlements resource client for managing on-chain USDC settlement records.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  SettlementSchema,
  CreateSettlementSchema,
  UpdateSettlementSchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Settlement = z.infer<typeof SettlementSchema>;
export type CreateSettlement = z.infer<typeof CreateSettlementSchema>;
export type UpdateSettlement = z.infer<typeof UpdateSettlementSchema>;

export interface ListSettlementsParams {
  orderId?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export class SettlementsResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /** Initiate a new USDC settlement for a completed order. */
  async create(data: CreateSettlement): Promise<ApiResponse<Settlement>> {
    const body = CreateSettlementSchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: "/settlements",
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Settlement>;
    throw result.error;
  }

  /** Retrieve a single settlement by ID. */
  async get(settlementId: string): Promise<ApiResponse<Settlement>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/settlements/${encodeURIComponent(settlementId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<Settlement>;
    throw result.error;
  }

  /**
   * Update a settlement's status — e.g., to record an on-chain transaction
   * hash once the transfer has been broadcast.
   */
  async update(settlementId: string, data: UpdateSettlement): Promise<ApiResponse<Settlement>> {
    const body = UpdateSettlementSchema.parse(data);
    const result = await this.transport.request({
      method: "PATCH",
      path: `/settlements/${encodeURIComponent(settlementId)}`,
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Settlement>;
    throw result.error;
  }

  /** List settlements with optional filtering by order or status. */
  async list(params?: ListSettlementsParams): Promise<ApiPage<Settlement>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.orderId) query["orderId"] = params.orderId;
    if (params?.status) query["status"] = params.status;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    const result = await this.transport.request({
      method: "GET",
      path: "/settlements",
      query,
    });
    if (result.ok) return result.value.body as ApiPage<Settlement>;
    throw result.error;
  }
}
