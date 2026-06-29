// In-memory implementation of TransactionRepository backed by MemoryStore.

import { ok, err, epochToIso } from "@veritas/core";
import type { Result, Page } from "@veritas/core";
import type { Transaction, CreateTransaction, TransactionKind } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import type { TransactionRepository } from "../repositories/transaction.repository.js";
import type { QueryOptions } from "../query.js";
import { evalFilter, applySort } from "../query.js";
import { paginateArray } from "../pagination.js";
import {
  toTransactionRow,
  fromTransactionRow,
  type TransactionRow,
} from "../mappers/transaction.mapper.js";

/** Compute balance after applying the transaction kind and amount to the current balance. */
function computeBalanceAfter(currentBalance: string, kind: TransactionKind, amount: { amount: string; currency: "USDC" }): string {
  const balanceCents = BigInt(currentBalance);
  const amountCents = BigInt(amount.amount);
  switch (kind) {
    case "CREDIT":
    case "REFUND":
      return String(balanceCents + amountCents);
    case "DEBIT":
    case "FEE":
      return String(balanceCents - amountCents);
    default:
      return currentBalance;
  }
}

/** In-memory TransactionRepository implementation for development and testing. */
export class TransactionMemoryRepository implements TransactionRepository {
  private readonly store = new MemoryStore<TransactionRow & { readonly id: string }>();
  /** Tracks the latest balance per walletId for running balance computation. */
  private readonly walletBalance = new Map<string, string>();

  async findById(id: string): Promise<Result<Transaction>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Transaction", id));
    }
    return ok(fromTransactionRow(row));
  }

  async list(options?: QueryOptions<Transaction>): Promise<Result<Page<Transaction>>> {
    let rows = this.store.all().map(fromTransactionRow);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateTransaction): Promise<Result<Transaction>> {
    const currentBalance = this.walletBalance.get(dto.walletId) ?? "0";
    const balanceAfterAmount = computeBalanceAfter(currentBalance, dto.kind, dto.amount);
    const balanceAfter = { amount: balanceAfterAmount, currency: "USDC" as const };
    const row = toTransactionRow(dto, balanceAfter);
    this.walletBalance.set(dto.walletId, balanceAfterAmount);
    const stored = this.store.set(row);
    return ok(fromTransactionRow(stored));
  }

  async update(_id: string, _dto: never): Promise<Result<Transaction>> {
    return err(new RepositoryNotFoundError("Transaction", "update-unsupported"));
  }

  async delete(id: string): Promise<Result<Transaction>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Transaction", id));
    }
    this.store.delete(id);
    return ok(fromTransactionRow(existing));
  }

  async findByWalletId(
    walletId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>> {
    let rows = this.store.all().map(fromTransactionRow).filter((r) => r.walletId === walletId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findByOrderId(
    orderId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>> {
    let rows = this.store.all().map(fromTransactionRow).filter((r) => r.orderId === orderId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findBySettlementId(
    settlementId: string,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>> {
    let rows = this.store
      .all()
      .map(fromTransactionRow)
      .filter((r) => r.settlementId === settlementId);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findByKind(
    kind: TransactionKind,
    options?: QueryOptions<Transaction>,
  ): Promise<Result<Page<Transaction>>> {
    let rows = this.store.all().map(fromTransactionRow).filter((r) => r.kind === kind);
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    } else {
      rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return ok(paginateArray(rows, options?.page));
  }

  async findLatestByWalletId(walletId: string): Promise<Result<Transaction>> {
    const rows = this.store
      .all()
      .map(fromTransactionRow)
      .filter((r) => r.walletId === walletId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (rows.length === 0) {
      return err(new RepositoryNotFoundError("Transaction", `wallet:${walletId}`));
    }
    return ok(rows[0]!);
  }
}
