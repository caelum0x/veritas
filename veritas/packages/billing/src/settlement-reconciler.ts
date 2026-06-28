// Reconcile CAP on-chain settlements against expected invoice amounts.

import {
  Id,
  newId,
  IsoTimestamp,
  epochToIso,
  Result,
  ok,
  err,
  Logger,
  noopLogger,
  OrderStatus,
} from "@veritas/core";
import { type MoneyValue, fromBaseUnits, addMoney, zeroMoney, compareMoney } from "./money.js";
import { Ledger, type OrgId } from "./ledger.js";
import { SettlementMismatchError } from "./errors.js";

export type SettlementStatus = "pending" | "matched" | "overpaid" | "underpaid" | "disputed";

export interface SettlementRecord {
  readonly id: Id<string>;
  readonly orderId: Id<string>;
  readonly organizationId: OrgId;
  readonly expectedAmount: MoneyValue;
  readonly settledAmount: MoneyValue;
  readonly status: SettlementStatus;
  readonly txHash: string | null;
  readonly settledAt: IsoTimestamp | null;
  readonly createdAt: IsoTimestamp;
  readonly notes: string;
}

export interface ReconciliationResult {
  readonly settlementId: Id<string>;
  readonly status: SettlementStatus;
  readonly expectedAmount: MoneyValue;
  readonly settledAmount: MoneyValue;
  readonly discrepancy: MoneyValue;
}

export interface SettlementReconcilerOptions {
  readonly ledger: Ledger;
  readonly logger?: Logger;
  /** Tolerance in micro-units: amounts within ±tolerance are considered matched. */
  readonly toleranceMicroUnits?: bigint;
}

export class SettlementReconciler {
  private readonly records = new Map<Id<string>, SettlementRecord>();
  private readonly ledger: Ledger;
  private readonly logger: Logger;
  private readonly tolerance: bigint;

  constructor(opts: SettlementReconcilerOptions) {
    this.ledger = opts.ledger;
    this.logger = opts.logger ?? noopLogger;
    this.tolerance = opts.toleranceMicroUnits ?? 0n;
  }

  /** Register a pending settlement expectation for an order. */
  registerExpected(
    orderId: Id<string>,
    organizationId: OrgId,
    expectedAmount: MoneyValue
  ): SettlementRecord {
    const record: SettlementRecord = {
      id: newId("settlement"),
      orderId,
      organizationId,
      expectedAmount,
      settledAmount: zeroMoney(),
      status: "pending",
      txHash: null,
      settledAt: null,
      createdAt: epochToIso(Date.now()),
      notes: "",
    };
    this.records.set(record.id, record);
    this.logger.info("settlement.registered", {
      id: record.id,
      orderId,
      expected: expectedAmount.amount.toString(),
    });
    return record;
  }

  /**
   * Reconcile an on-chain settlement against the registered expectation.
   * Updates the ledger on success (matched/overpaid) or flags mismatch.
   */
  reconcile(
    settlementId: Id<string>,
    settledMicroUnits: bigint,
    txHash: string
  ): Result<ReconciliationResult, SettlementMismatchError> {
    const record = this.records.get(settlementId);
    if (!record) {
      return err(
        new SettlementMismatchError(0n, settledMicroUnits, `unknown:${settlementId}`)
      );
    }

    const settledAmount = fromBaseUnits(settledMicroUnits);
    const expected = record.expectedAmount.amount;
    const actual = settledMicroUnits;
    const diff = actual >= expected ? actual - expected : expected - actual;

    let status: SettlementStatus;
    if (diff <= this.tolerance) {
      status = "matched";
    } else if (actual > expected) {
      status = "overpaid";
    } else {
      status = "underpaid";
    }

    const discrepancy = fromBaseUnits(diff);
    const updated: SettlementRecord = {
      ...record,
      settledAmount,
      status,
      txHash,
      settledAt: epochToIso(Date.now()),
      notes:
        status === "matched"
          ? "Settlement matched expected amount."
          : status === "overpaid"
          ? `Overpaid by ${diff} micro-USDC.`
          : `Underpaid by ${diff} micro-USDC.`,
    };
    this.records.set(settlementId, updated);

    if (status === "matched" || status === "overpaid") {
      this.ledger.append(
        record.organizationId,
        "settlement",
        settledAmount,
        `CAP settlement for order ${record.orderId}`,
        { referenceId: record.orderId, metadata: { txHash, settlementId } }
      );
    }

    this.logger.info("settlement.reconciled", {
      id: settlementId,
      status,
      expected: expected.toString(),
      actual: actual.toString(),
      diff: diff.toString(),
    });

    if (status === "underpaid") {
      return err(
        new SettlementMismatchError(expected, actual, record.orderId)
      );
    }

    return ok({ settlementId, status, expectedAmount: record.expectedAmount, settledAmount, discrepancy });
  }

  /** Mark a settlement as disputed (e.g. on-chain tx not found or reversed). */
  dispute(settlementId: Id<string>, reason: string): boolean {
    const record = this.records.get(settlementId);
    if (!record) return false;
    this.records.set(settlementId, { ...record, status: "disputed", notes: reason });
    this.logger.warn("settlement.disputed", { id: settlementId, reason });
    return true;
  }

  getRecord(settlementId: Id<string>): SettlementRecord | undefined {
    return this.records.get(settlementId);
  }

  /** Return all settlement records for an organization. */
  recordsForOrg(organizationId: OrgId): readonly SettlementRecord[] {
    return Array.from(this.records.values()).filter(
      (r) => r.organizationId === organizationId
    );
  }

  /** Summarize total settled for an organization. */
  totalSettled(organizationId: OrgId): MoneyValue {
    return this.recordsForOrg(organizationId)
      .filter((r) => r.status === "matched" || r.status === "overpaid")
      .reduce((acc, r) => addMoney(acc, r.settledAmount), zeroMoney());
  }
}
