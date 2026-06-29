// Mapper between Transaction domain objects and raw persistence rows.

import type { Transaction, CreateTransaction, TransactionKind } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";

/** Persistence row shape for a Transaction. */
export type TransactionRow = {
  readonly id: string;
  readonly walletId: string;
  readonly orderId: string | null;
  readonly settlementId: string | null;
  readonly kind: string;
  readonly amountValue: string;
  readonly amountCurrency: "USDC";
  readonly balanceAfterValue: string;
  readonly balanceAfterCurrency: "USDC";
  readonly description: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
};

/** Map a CreateTransaction DTO to a new TransactionRow with generated id and timestamps. */
export function toTransactionRow(
  dto: CreateTransaction,
  balanceAfter: { amount: string; currency: "USDC" },
): TransactionRow {
  const now = Date.now();
  return {
    id: newId("txn"),
    walletId: dto.walletId,
    orderId: dto.orderId ?? null,
    settlementId: dto.settlementId ?? null,
    kind: dto.kind,
    amountValue: dto.amount.amount,
    amountCurrency: dto.amount.currency,
    balanceAfterValue: balanceAfter.amount,
    balanceAfterCurrency: balanceAfter.currency,
    description: dto.description ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a persisted TransactionRow to a Transaction domain object. */
export function fromTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id as Transaction["id"],
    walletId: row.walletId as Transaction["walletId"],
    orderId: (row.orderId ?? null) as Transaction["orderId"],
    settlementId: (row.settlementId ?? null) as Transaction["settlementId"],
    kind: row.kind as TransactionKind,
    amount: { amount: row.amountValue, currency: row.amountCurrency },
    balanceAfter: { amount: row.balanceAfterValue, currency: row.balanceAfterCurrency },
    description: row.description,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Map a Transaction domain object back to a persistence row. */
export function fromTransactionDomain(txn: Transaction): TransactionRow {
  return {
    id: txn.id,
    walletId: txn.walletId,
    orderId: txn.orderId ?? null,
    settlementId: txn.settlementId ?? null,
    kind: txn.kind,
    amountValue: txn.amount.amount,
    amountCurrency: txn.amount.currency,
    balanceAfterValue: txn.balanceAfter.amount,
    balanceAfterCurrency: txn.balanceAfter.currency,
    description: txn.description,
    createdAt: isoToEpoch(txn.createdAt) ?? 0,
    updatedAt: isoToEpoch(txn.updatedAt) ?? 0,
  };
}
