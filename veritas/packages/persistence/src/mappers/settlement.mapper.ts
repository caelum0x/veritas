// Mapper between Settlement domain objects and raw persistence rows.

import type { Settlement, CreateSettlement, UpdateSettlement, SettlementStatus } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";

/** Persistence row shape for a Settlement. */
export type SettlementRow = {
  readonly id: string;
  readonly orderId: string;
  readonly chain: "base";
  readonly txHash: string;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly amountValue: string;
  readonly amountCurrency: "USDC";
  readonly status: string;
  readonly blockNumber: number | null;
  readonly confirmedAt: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
};

/** Map a CreateSettlement DTO to a new SettlementRow with generated id and timestamps. */
export function toSettlementRow(dto: CreateSettlement): SettlementRow {
  const now = Date.now();
  return {
    id: newId("stl"),
    orderId: dto.orderId,
    chain: "base",
    txHash: dto.txHash,
    fromAddress: dto.fromAddress,
    toAddress: dto.toAddress,
    amountValue: dto.amount.amount,
    amountCurrency: dto.amount.currency,
    status: "SUBMITTED",
    blockNumber: null,
    confirmedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Map a persisted SettlementRow to a Settlement domain object. */
export function fromSettlementRow(row: SettlementRow): Settlement {
  return {
    id: row.id as Settlement["id"],
    orderId: row.orderId as Settlement["orderId"],
    chain: row.chain,
    txHash: row.txHash,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    amount: { amount: row.amountValue, currency: row.amountCurrency },
    status: row.status as SettlementStatus,
    blockNumber: row.blockNumber,
    confirmedAt: row.confirmedAt,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Merge an UpdateSettlement patch into an existing SettlementRow, refreshing updatedAt. */
export function mergeSettlementRow(
  existing: SettlementRow,
  patch: UpdateSettlement,
): SettlementRow {
  return {
    ...existing,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.blockNumber !== undefined ? { blockNumber: patch.blockNumber } : {}),
    ...(patch.confirmedAt !== undefined ? { confirmedAt: patch.confirmedAt } : {}),
    updatedAt: Date.now(),
  };
}

/** Map a Settlement domain object back to a persistence row. */
export function fromSettlementDomain(settlement: Settlement): SettlementRow {
  return {
    id: settlement.id,
    orderId: settlement.orderId,
    chain: settlement.chain,
    txHash: settlement.txHash,
    fromAddress: settlement.fromAddress,
    toAddress: settlement.toAddress,
    amountValue: settlement.amount.amount,
    amountCurrency: settlement.amount.currency,
    status: settlement.status,
    blockNumber: settlement.blockNumber,
    confirmedAt: settlement.confirmedAt,
    createdAt: isoToEpoch(settlement.createdAt) ?? 0,
    updatedAt: isoToEpoch(settlement.updatedAt) ?? 0,
  };
}
