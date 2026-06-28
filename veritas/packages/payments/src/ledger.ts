// Append-only in-memory double-entry ledger: journal lines never mutated after insert.

import { newId, epochToIso, type IsoTimestamp } from "@veritas/core";
import type { Money } from "@veritas/contracts";
import {
  makeLedgerEntry,
  type LedgerEntry,
  type LedgerAccountId,
  type JournalLine,
} from "./ledger-entry.js";

export interface LedgerJournal {
  readonly id: string;
  readonly description: string;
  readonly lines: readonly JournalLine[];
  readonly postedAt: IsoTimestamp;
}

export interface PostJournalRequest {
  readonly description: string;
  readonly referenceId?: string | null;
  readonly referenceType?: string | null;
  readonly debitAccountId: LedgerAccountId;
  readonly creditAccountId: LedgerAccountId;
  readonly amount: Money;
}

/** Append-only ledger holding immutable journal lines in memory. */
export class InMemoryLedger {
  private readonly journals: Map<string, LedgerJournal> = new Map();

  /** Post a balanced debit/credit pair as a new journal entry. */
  post(req: PostJournalRequest): LedgerJournal {
    const now = epochToIso(Date.now());
    const journalId = newId("jrn");

    const debit = makeLedgerEntry({
      journalId,
      accountId: req.debitAccountId,
      kind: "DEBIT",
      amount: req.amount,
      description: req.description,
      referenceId: req.referenceId ?? null,
      referenceType: req.referenceType ?? null,
      createdAt: now,
    });

    const credit = makeLedgerEntry({
      journalId,
      accountId: req.creditAccountId,
      kind: "CREDIT",
      amount: req.amount,
      description: req.description,
      referenceId: req.referenceId ?? null,
      referenceType: req.referenceType ?? null,
      createdAt: now,
    });

    const journal: LedgerJournal = {
      id: journalId,
      description: req.description,
      lines: [{ debit, credit }],
      postedAt: now,
    };

    this.journals.set(journalId, journal);
    return journal;
  }

  /** Retrieve all entries for a given account (debit and credit). */
  entriesForAccount(accountId: LedgerAccountId): readonly LedgerEntry[] {
    const result: LedgerEntry[] = [];
    for (const journal of this.journals.values()) {
      for (const line of journal.lines) {
        if (line.debit.accountId === accountId) result.push(line.debit);
        if (line.credit.accountId === accountId) result.push(line.credit);
      }
    }
    return result;
  }

  /** Retrieve all journals for a given reference (e.g. orderId). */
  journalsForReference(referenceId: string): readonly LedgerJournal[] {
    const result: LedgerJournal[] = [];
    for (const journal of this.journals.values()) {
      const hasRef = journal.lines.some(
        (l) => l.debit.referenceId === referenceId || l.credit.referenceId === referenceId,
      );
      if (hasRef) result.push(journal);
    }
    return result;
  }

  /** Return a snapshot of all journals (immutable copy). */
  allJournals(): readonly LedgerJournal[] {
    return [...this.journals.values()];
  }
}
