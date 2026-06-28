// Settlement bookkeeping for completed CAP orders — records on-chain USDC settlements.

import { epochToIso, newId, Logger, Usdc } from "@veritas/core";
import type { OrderId } from "@veritas/core";

/** A single recorded settlement entry. */
export interface SettlementRecord {
  readonly id: string;
  readonly orderId: OrderId;
  readonly amountUsdc: string;
  readonly txHash: string | null;
  readonly settledAt: string;
  readonly notes: string;
}

/** Thin in-memory ledger of settlements, append-only. */
export interface SettlementLedger {
  /** Record a completed settlement. */
  record(entry: Omit<SettlementRecord, "id" | "settledAt">): SettlementRecord;
  /** Return all recorded settlements. */
  all(): ReadonlyArray<SettlementRecord>;
  /** Return total USDC earned as a Usdc value object. */
  totalEarned(): Usdc;
  /** Lookup a settlement by orderId (latest if multiple). */
  findByOrderId(orderId: OrderId): SettlementRecord | undefined;
}

/**
 * Creates an in-memory settlement ledger that logs each entry via the
 * supplied Logger. All entries are immutable once recorded.
 */
export function makeSettlementLedger(logger: Logger): SettlementLedger {
  const entries: SettlementRecord[] = [];

  return {
    record(entry): SettlementRecord {
      const record: SettlementRecord = {
        id: newId("settlement"),
        settledAt: epochToIso(Date.now()),
        ...entry,
      };
      entries.push(record);
      logger.info("[cap:settlement] order settled", {
        orderId: record.orderId,
        amountUsdc: record.amountUsdc,
        txHash: record.txHash,
      });
      return record;
    },

    all(): ReadonlyArray<SettlementRecord> {
      return [...entries];
    },

    totalEarned(): Usdc {
      return entries.reduce(
        (acc, e) => acc.add(Usdc.fromDecimalString(e.amountUsdc)),
        Usdc.ZERO,
      );
    },

    findByOrderId(orderId: OrderId): SettlementRecord | undefined {
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i]!.orderId === orderId) return entries[i];
      }
      return undefined;
    },
  };
}
