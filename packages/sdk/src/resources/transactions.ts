// Transactions resource client for querying USDC ledger transactions.
import type { z } from "zod";
import type { Transport } from "../http/transport.js";
import type { SdkConfig } from "../config.js";
import {
  TransactionSchema,
  CreateTransactionSchema,
  TransactionKindSchema,
} from "@veritas/contracts";
import type { ApiResponse, ApiPage } from "@veritas/core";

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
export type TransactionKind = z.infer<typeof TransactionKindSchema>;

export interface ListTransactionsParams {
  walletId?: string;
  settlementId?: string;
  kind?: TransactionKind;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  cursor?: string;
}

export class TransactionsResource {
  constructor(
    private readonly transport: Transport,
    private readonly _config: SdkConfig,
  ) {}

  /**
   * Record a new ledger transaction. Typically called internally by settlement
   * flows; external callers may also use this to register off-platform transfers.
   */
  async create(data: CreateTransaction): Promise<ApiResponse<Transaction>> {
    const body = CreateTransactionSchema.parse(data);
    const result = await this.transport.request({
      method: "POST",
      path: "/transactions",
      body,
    });
    if (result.ok) return result.value.body as ApiResponse<Transaction>;
    throw result.error;
  }

  /** Retrieve a single transaction by ID. */
  async get(transactionId: string): Promise<ApiResponse<Transaction>> {
    const result = await this.transport.request({
      method: "GET",
      path: `/transactions/${encodeURIComponent(transactionId)}`,
    });
    if (result.ok) return result.value.body as ApiResponse<Transaction>;
    throw result.error;
  }

  /** List transactions with optional filters for wallet, settlement, kind, and date range. */
  async list(params?: ListTransactionsParams): Promise<ApiPage<Transaction>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.walletId) query["walletId"] = params.walletId;
    if (params?.settlementId) query["settlementId"] = params.settlementId;
    if (params?.kind) query["kind"] = params.kind;
    if (params?.fromDate) query["fromDate"] = params.fromDate;
    if (params?.toDate) query["toDate"] = params.toDate;
    if (params?.limit !== undefined) query["limit"] = params.limit;
    if (params?.cursor) query["cursor"] = params.cursor;
    const result = await this.transport.request({
      method: "GET",
      path: "/transactions",
      query,
    });
    if (result.ok) return result.value.body as ApiPage<Transaction>;
    throw result.error;
  }
}
