// Credit ledger: append-only log of credit transactions for auditing and balance reconstruction.

import { z } from "zod";
import { newId, type Id, type UserId } from "@veritas/core";
import { creditAmountSchema, type CreditAmount } from "./credit.js";
import { type GrantId } from "./grant.js";

/** Branded ledger entry identifier. */
export type LedgerEntryId = Id<"ledger">;
export const newLedgerEntryId = (): LedgerEntryId => newId("ledger");

/** All possible ledger transaction kinds. */
export type LedgerEntryKind =
  | "grant"
  | "consume"
  | "reserve"
  | "release"
  | "expire"
  | "adjustment";

export const ledgerEntryKindSchema = z.enum([
  "grant",
  "consume",
  "reserve",
  "release",
  "expire",
  "adjustment",
]);

/** Immutable ledger entry (append-only). */
export interface LedgerEntry {
  readonly id: LedgerEntryId;
  readonly userId: UserId;
  readonly kind: LedgerEntryKind;
  /** Positive = credit, negative = debit. */
  readonly delta: number;
  readonly grantId: GrantId | null;
  readonly referenceId: string | null;
  readonly note: string;
  readonly recordedAt: string;
}

export const ledgerEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  kind: ledgerEntryKindSchema,
  delta: z.number().int(),
  grantId: z.string().nullable(),
  referenceId: z.string().nullable(),
  note: z.string(),
  recordedAt: z.string().datetime(),
});

export interface CreateLedgerEntryParams {
  readonly userId: UserId;
  readonly kind: LedgerEntryKind;
  readonly delta: number;
  readonly grantId?: GrantId | null;
  readonly referenceId?: string | null;
  readonly note: string;
  readonly recordedAt: string;
}

/** Construct a new immutable LedgerEntry. */
export function makeLedgerEntry(params: CreateLedgerEntryParams): LedgerEntry {
  return Object.freeze({
    id: newLedgerEntryId(),
    userId: params.userId,
    kind: params.kind,
    delta: params.delta,
    grantId: params.grantId ?? null,
    referenceId: params.referenceId ?? null,
    note: params.note,
    recordedAt: params.recordedAt,
  });
}

/** Compute net balance from a sequence of ledger entries. */
export function computeNetBalance(entries: ReadonlyArray<LedgerEntry>): number {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

/** Filter entries to a specific kind. */
export function filterByKind(
  entries: ReadonlyArray<LedgerEntry>,
  kind: LedgerEntryKind,
): ReadonlyArray<LedgerEntry> {
  return entries.filter((e) => e.kind === kind);
}

/** Sum absolute values of debit entries (negative delta). */
export function totalDebits(entries: ReadonlyArray<LedgerEntry>): CreditAmount {
  return entries
    .filter((e) => e.delta < 0)
    .reduce((sum, e) => sum + Math.abs(e.delta), 0) as CreditAmount;
}

/** Sum credit entries (positive delta). */
export function totalCredits(entries: ReadonlyArray<LedgerEntry>): CreditAmount {
  return entries
    .filter((e) => e.delta > 0)
    .reduce((sum, e) => sum + e.delta, 0) as CreditAmount;
}
