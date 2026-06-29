// Double-entry ledger entry: immutable record of a single debit or credit line.

import type { Money } from "@veritas/contracts";
import type { IsoTimestamp } from "@veritas/core";
import { newId } from "@veritas/core";

export type LedgerEntryId = `led_${string}`;
export type LedgerAccountId = `acct_${string}`;

export type LedgerEntryKind = "DEBIT" | "CREDIT";

export interface LedgerEntry {
  readonly id: LedgerEntryId;
  readonly journalId: string;
  readonly accountId: LedgerAccountId;
  readonly kind: LedgerEntryKind;
  readonly amount: Money;
  readonly description: string;
  readonly referenceId: string | null;
  readonly referenceType: string | null;
  readonly createdAt: IsoTimestamp;
}

export interface CreateLedgerEntry {
  readonly journalId: string;
  readonly accountId: LedgerAccountId;
  readonly kind: LedgerEntryKind;
  readonly amount: Money;
  readonly description: string;
  readonly referenceId?: string | null;
  readonly referenceType?: string | null;
  readonly createdAt: IsoTimestamp;
}

/** Create an immutable LedgerEntry from the provided fields. */
export function makeLedgerEntry(input: CreateLedgerEntry): LedgerEntry {
  return {
    id: newId("led") as LedgerEntryId,
    journalId: input.journalId,
    accountId: input.accountId,
    kind: input.kind,
    amount: input.amount,
    description: input.description,
    referenceId: input.referenceId ?? null,
    referenceType: input.referenceType ?? null,
    createdAt: input.createdAt,
  };
}

/** Pair a debit + credit entry forming one balanced journal line. */
export interface JournalLine {
  readonly debit: LedgerEntry;
  readonly credit: LedgerEntry;
}
