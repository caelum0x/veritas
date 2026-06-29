// TransactionRepository interface defining persistence operations for ledger transactions.

import type { Result, Page } from "@veritas/core";
import type { Transaction, CreateTransaction, TransactionKind } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Transaction entities. */
export interface TransactionRepository
  extends BaseRepository<Transaction, CreateTransaction, never> {
  /** Find a single transaction by its opaque ID. */
  findById(id: string): Promise<Result<Transaction>>;

  /** List transactions with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Transaction>): Promise<Result<Page<Transaction>>>;

  /** Create a new ledger transaction, computing balanceAfter from wallet state. */
  create(dto: CreateTransaction): Promise<Result<Transaction>>;

  /** Transactions are immutable ledger records; delete returns the record. */
  delete(id: string): Promise<Result<Transaction>>;

  /** Update is intentionally unsupported for immutable ledger records. */
  update(id: string, dto: never): Promise<Result<Transaction>>;

  /** Find all transactions for a given wallet, ordered by createdAt descending. */
  findByWalletId(
    walletId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>>;

  /** Find all transactions associated with an order. */
  findByOrderId(
    orderId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>>;

  /** Find all transactions associated with a settlement. */
  findBySettlementId(
    settlementId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>>;

  /** Find transactions by kind (CREDIT, DEBIT, REFUND, FEE). */
  findByKind(
    kind: TransactionKind,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>>;

  /** Retrieve the most recent transaction for a wallet to determine current balance. */
  findLatestByWalletId(walletId: string): Promise<Result<Transaction>>;
}
