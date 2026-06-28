// Transaction application service: use-cases for ledger transaction management.
import { Result, AppError, ok, toPageRequest } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { Transaction, TransactionKind } from "@veritas/contracts";
import type { TransactionRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, ServiceValidationError, PreconditionFailedError } from "../errors.js";
import type {
  CreateTransactionInput,
  ListTransactionsInput,
  ListWalletTransactionsInput,
} from "./transaction.dto.js";

/** Dependencies injected into TransactionService. */
export interface TransactionServiceDeps extends BaseServiceDeps {
  readonly transactionRepository: TransactionRepository;
}

/** Application service for recording and querying immutable ledger transactions. */
export class TransactionService extends BaseService {
  private readonly transactions: TransactionRepository;

  constructor(deps: TransactionServiceDeps) {
    super(deps);
    this.transactions = deps.transactionRepository;
  }

  /** Retrieve a transaction by its id. */
  async getById(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<Transaction, AppError>> {
    return serviceCall(async () => {
      const result = await this.transactions.findById(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Transaction", id);
      }
      this.log(ctx, "debug", "transaction.getById", { transactionId: id });
      return result.value;
    });
  }

  /** List transactions with optional filters and pagination. */
  async list(
    ctx: ServiceContext,
    input: ListTransactionsInput,
  ): Promise<Result<Page<Transaction>, AppError>> {
    return serviceCall(async () => {
      const { walletId, orderId, settlementId, kind, cursor, limit } = input;
      const page = toPageRequest({ cursor, limit });

      let result: Awaited<ReturnType<typeof this.transactions.list>>;

      if (walletId) {
        result = await this.transactions.findByWalletId(walletId, { page: page });
      } else if (orderId) {
        result = await this.transactions.findByOrderId(orderId, { page: page });
      } else if (settlementId) {
        result = await this.transactions.findBySettlementId(settlementId, { page: page });
      } else if (kind) {
        result = await this.transactions.findByKind(kind as TransactionKind, { page: page });
      } else {
        result = await this.transactions.list({ page: page });
      }

      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "debug", "transaction.list", { count: result.value.items.length });
      return result.value;
    });
  }

  /** List transactions for a given wallet ordered by createdAt descending. */
  async listByWallet(
    ctx: ServiceContext,
    walletId: string,
    input: ListWalletTransactionsInput,
  ): Promise<Result<Page<Transaction>, AppError>> {
    return serviceCall(async () => {
      if (!walletId || walletId.trim().length === 0) {
        throw new ServiceValidationError("walletId must not be blank.");
      }
      const page = toPageRequest({ cursor: input.cursor, limit: input.limit });
      const result = await this.transactions.findByWalletId(walletId, { page: page });
      if (!result.ok) {
        throw result.error;
      }
      this.log(ctx, "debug", "transaction.listByWallet", {
        walletId,
        count: result.value.items.length,
      });
      return result.value;
    });
  }

  /** Retrieve the most recent transaction for a wallet (for current balance). */
  async getLatestByWallet(
    ctx: ServiceContext,
    walletId: string,
  ): Promise<Result<Transaction, AppError>> {
    return serviceCall(async () => {
      if (!walletId || walletId.trim().length === 0) {
        throw new ServiceValidationError("walletId must not be blank.");
      }
      const result = await this.transactions.findLatestByWalletId(walletId);
      if (!result.ok) {
        throw new ResourceNotFoundError("Transaction", `latest for wallet ${walletId}`);
      }
      this.log(ctx, "debug", "transaction.getLatestByWallet", { walletId });
      return result.value;
    });
  }

  /** Record a new ledger transaction. Transactions are immutable once created. */
  async create(
    ctx: ServiceContext,
    input: CreateTransactionInput,
  ): Promise<Result<Transaction, AppError>> {
    return serviceCall(async () => {
      if (!input.walletId || input.walletId.trim().length === 0) {
        throw new ServiceValidationError("walletId must not be blank.");
      }

      const amountStr = String(input.amount);
      if (amountStr === "0" || parseFloat(amountStr) <= 0) {
        throw new PreconditionFailedError("Transaction amount must be greater than zero.");
      }

      const result = await this.transactions.create(input);
      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "info", "transaction.created", {
        transactionId: result.value.id,
        walletId: result.value.walletId,
        kind: result.value.kind,
        amount: String(result.value.amount),
      });
      return result.value;
    });
  }
}
