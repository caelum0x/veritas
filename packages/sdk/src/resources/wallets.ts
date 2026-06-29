// Wallets resource client: create and retrieve USDC wallets for agents and users.
import type { ApiResponse } from "@veritas/core";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import { buildRequest, interpolatePath, toQueryParams } from "../http/request.js";
import { SdkHttpError } from "../http/errors.js";
import type { z } from "zod";
import { WalletSchema, CreateWalletSchema } from "@veritas/contracts";

export type Wallet = z.infer<typeof WalletSchema>;
export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;

export interface ListWalletsParams {
  ownerId?: string;
  page?: number;
  limit?: number;
}

export class WalletsResource {
  constructor(
    private readonly transport: Transport,
    private readonly config: SdkConfig,
  ) {}

  async create(input: CreateWalletInput): Promise<Wallet> {
    const req = buildRequest({ method: "POST", path: "/wallets", body: input }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Wallet>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Unexpected response body", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }

  async get(walletId: string): Promise<Wallet> {
    const path = interpolatePath("/wallets/:walletId", { walletId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Wallet>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Wallet not found in response", code: "not_found", status: result.value.status });
    }
    throw result.error;
  }

  async list(params?: ListWalletsParams): Promise<Wallet[]> {
    const query = toQueryParams({
      ownerId: params?.ownerId,
      page: params?.page,
      limit: params?.limit,
    });
    const req = buildRequest({ method: "GET", path: "/wallets", query }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<Wallet[]>;
      if ("data" in body && Array.isArray(body.data)) return body.data;
      return [];
    }
    throw result.error;
  }

  async getBalance(walletId: string): Promise<{ walletId: string; balanceUsdc: string }> {
    const path = interpolatePath("/wallets/:walletId/balance", { walletId });
    const req = buildRequest({ method: "GET", path }, this.config);
    const result = await this.transport.request(req);
    if (result.ok) {
      const body = result.value.body as ApiResponse<{ walletId: string; balanceUsdc: string }>;
      if ("data" in body && body.data != null) return body.data;
      throw new SdkHttpError({ message: "Balance data missing in response", code: "unknown", status: result.value.status });
    }
    throw result.error;
  }
}
