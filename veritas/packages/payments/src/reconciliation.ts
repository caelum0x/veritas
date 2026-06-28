// Reconcile on-chain USDC settlements against internal ledger records.

import { ok, err, type Result } from "@veritas/core";
import type { Settlement, Order, Money } from "@veritas/contracts";
import type { InMemoryLedger } from "./ledger.js";

export type ReconciliationStatus =
  | "MATCHED"
  | "AMOUNT_MISMATCH"
  | "MISSING_JOURNAL"
  | "UNCONFIRMED";

export interface ReconciliationRecord {
  readonly settlementId: string;
  readonly orderId: string;
  readonly status: ReconciliationStatus;
  readonly onChainAmount: Money;
  readonly ledgerAmount: Money | null;
  readonly reconciledAt: string;
}

export type ReconciliationError =
  | { kind: "UNCONFIRMED_SETTLEMENT"; settlementId: string }
  | { kind: "MISSING_ORDER"; settlementId: string }
  | { kind: "AMOUNT_MISMATCH"; settlementId: string; onChain: Money; ledger: Money };

function moneyEqual(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/** Reconcile a single on-chain settlement against its order and ledger journals. */
export function reconcileSettlement(
  settlement: Settlement,
  order: Order,
  ledger: InMemoryLedger,
): Result<ReconciliationRecord, ReconciliationError> {
  const reconciledAt = new Date().toISOString();

  if (settlement.status !== "CONFIRMED") {
    return err({ kind: "UNCONFIRMED_SETTLEMENT", settlementId: settlement.id });
  }

  const journals = ledger.journalsForReference(order.id);

  if (journals.length === 0) {
    const record: ReconciliationRecord = {
      settlementId: settlement.id,
      orderId: order.id,
      status: "MISSING_JOURNAL",
      onChainAmount: settlement.amount,
      ledgerAmount: null,
      reconciledAt,
    };
    return ok(record);
  }

  // Sum all credit amounts posted for this order reference.
  let totalLedgerBaseUnits = 0n;
  for (const journal of journals) {
    for (const line of journal.lines) {
      if (
        line.credit.referenceId === order.id &&
        line.credit.amount.currency === "USDC"
      ) {
        totalLedgerBaseUnits += BigInt(line.credit.amount.amount);
      }
    }
  }

  const ledgerAmount: Money = {
    currency: "USDC",
    amount: totalLedgerBaseUnits.toString(),
  };

  if (!moneyEqual(settlement.amount, ledgerAmount)) {
    return err({
      kind: "AMOUNT_MISMATCH",
      settlementId: settlement.id,
      onChain: settlement.amount,
      ledger: ledgerAmount,
    });
  }

  return ok({
    settlementId: settlement.id,
    orderId: order.id,
    status: "MATCHED",
    onChainAmount: settlement.amount,
    ledgerAmount,
    reconciledAt,
  });
}

export interface ReconciliationReport {
  readonly total: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly missing: number;
  readonly records: readonly ReconciliationRecord[];
  readonly errors: readonly ReconciliationError[];
}

/** Reconcile a batch of settlements, returning a summary report. */
export function reconcileBatch(
  pairs: ReadonlyArray<{ settlement: Settlement; order: Order }>,
  ledger: InMemoryLedger,
): ReconciliationReport {
  const records: ReconciliationRecord[] = [];
  const errors: ReconciliationError[] = [];
  let matched = 0;
  let mismatched = 0;
  let missing = 0;

  for (const { settlement, order } of pairs) {
    const result = reconcileSettlement(settlement, order, ledger);
    if (result.ok) {
      records.push(result.value);
      if (result.value.status === "MATCHED") matched++;
      else if (result.value.status === "MISSING_JOURNAL") missing++;
    } else {
      errors.push(result.error);
      if (result.error.kind === "AMOUNT_MISMATCH") mismatched++;
    }
  }

  return {
    total: pairs.length,
    matched,
    mismatched,
    missing,
    records,
    errors,
  };
}
