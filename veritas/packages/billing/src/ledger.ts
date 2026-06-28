// Append-only billing ledger: immutable log of all monetary transactions.

import { Id, newId, IsoTimestamp, epochToIso, Logger, noopLogger } from "@veritas/core";
import { type MoneyValue, addMoney, zeroMoney, subtractMoney } from "./money.js";
import { LedgerIntegrityError } from "./errors.js";

export type LedgerEntryId = Id<"ledger">;
export type OrgId = Id<"org">;
export type RefId = Id<string>;

export type LedgerEntryKind =
  | "charge"
  | "credit"
  | "refund"
  | "settlement"
  | "adjustment";

export interface LedgerEntry {
  readonly id: LedgerEntryId;
  readonly organizationId: OrgId;
  readonly kind: LedgerEntryKind;
  readonly amount: MoneyValue;
  readonly description: string;
  /** Reference to invoice, order, or settlement ID. */
  readonly referenceId: RefId | null;
  readonly createdAt: IsoTimestamp;
  readonly metadata: Record<string, string>;
  /** Hash of previous entry id for chain integrity; null for first entry per org. */
  readonly previousEntryId: LedgerEntryId | null;
}

export interface LedgerBalance {
  readonly organizationId: OrgId;
  readonly totalCharged: MoneyValue;
  readonly totalCredited: MoneyValue;
  readonly totalRefunded: MoneyValue;
  readonly totalSettled: MoneyValue;
  /** Net amount owed: charged - (credited + refunded + settled), floored at zero. */
  readonly net: MoneyValue;
}

export interface LedgerOptions {
  readonly logger?: Logger;
}

export class Ledger {
  private readonly entries: LedgerEntry[] = [];
  private readonly lastEntryIdByOrg = new Map<OrgId, LedgerEntryId>();
  private readonly logger: Logger;

  constructor(opts: LedgerOptions = {}) {
    this.logger = opts.logger ?? noopLogger;
  }

  append(
    organizationId: OrgId,
    kind: LedgerEntryKind,
    amount: MoneyValue,
    description: string,
    opts: {
      referenceId?: RefId;
      metadata?: Record<string, string>;
      createdAt?: IsoTimestamp;
    } = {}
  ): LedgerEntry {
    if (amount.amount < 0n) {
      throw new LedgerIntegrityError("Ledger entry amount must be non-negative");
    }
    const previousEntryId = this.lastEntryIdByOrg.get(organizationId) ?? null;
    const entry: LedgerEntry = {
      id: newId("ledger"),
      organizationId,
      kind,
      amount,
      description,
      referenceId: opts.referenceId ?? null,
      createdAt: opts.createdAt ?? epochToIso(Date.now()),
      metadata: opts.metadata ?? {},
      previousEntryId,
    };
    this.entries.push(entry);
    this.lastEntryIdByOrg.set(organizationId, entry.id);
    this.logger.info("ledger.append", {
      id: entry.id,
      organizationId,
      kind,
      amount: amount.amount.toString(),
    });
    return entry;
  }

  /** Return all entries for the given organization, in insertion order. */
  entriesFor(organizationId: OrgId): readonly LedgerEntry[] {
    return this.entries.filter((e) => e.organizationId === organizationId);
  }

  /** Return entries filtered by kind for an organization. */
  entriesForKind(organizationId: OrgId, kind: LedgerEntryKind): readonly LedgerEntry[] {
    return this.entries.filter(
      (e) => e.organizationId === organizationId && e.kind === kind
    );
  }

  allEntries(): readonly LedgerEntry[] {
    return [...this.entries];
  }

  /** Compute balance totals for an organization. */
  balance(organizationId: OrgId): LedgerBalance {
    const orgEntries = this.entriesFor(organizationId);
    let totalCharged = zeroMoney();
    let totalCredited = zeroMoney();
    let totalRefunded = zeroMoney();
    let totalSettled = zeroMoney();

    for (const e of orgEntries) {
      switch (e.kind) {
        case "charge":
          totalCharged = addMoney(totalCharged, e.amount);
          break;
        case "credit":
        case "adjustment":
          totalCredited = addMoney(totalCredited, e.amount);
          break;
        case "refund":
          totalRefunded = addMoney(totalRefunded, e.amount);
          break;
        case "settlement":
          totalSettled = addMoney(totalSettled, e.amount);
          break;
      }
    }

    const deductions = addMoney(addMoney(totalCredited, totalRefunded), totalSettled);
    const net =
      totalCharged.amount >= deductions.amount
        ? subtractMoney(totalCharged, deductions)
        : zeroMoney();

    return {
      organizationId,
      totalCharged,
      totalCredited,
      totalRefunded,
      totalSettled,
      net,
    };
  }

  /**
   * Verify chain integrity for an organization's entries.
   * Each entry's previousEntryId must match the id of the preceding entry.
   */
  verifyChain(organizationId: OrgId): boolean {
    const orgEntries = this.entriesFor(organizationId);
    let expectedPrevId: LedgerEntryId | null = null;
    for (const e of orgEntries) {
      if (e.previousEntryId !== expectedPrevId) {
        return false;
      }
      expectedPrevId = e.id;
    }
    return true;
  }
}
