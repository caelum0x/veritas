// Flow: issue a credit grant, append the ledger entry, and update the balance snapshot.
import { ok, err, type Result, type UserId, type Clock } from "@veritas/core";
import {
  makeGrant,
  makeLedgerEntry,
  applyGrant,
  zeroBalance,
  type CreditAmount,
  type CreditSource,
  type CreditStore,
  type CreditBalance,
  type CreditGrant,
  type LedgerEntry,
  type CreditError,
  type CreditNotifier,
} from "@veritas/credits";
import { type Logger } from "@veritas/observability";

export interface GrantCreditsDeps {
  readonly store: CreditStore;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly notifier?: CreditNotifier;
}

export interface GrantCreditsInput {
  readonly userId: UserId;
  readonly amount: CreditAmount;
  readonly source: CreditSource;
  readonly reason: string;
  readonly expiresAt: string | null;
  readonly metadata?: Record<string, string>;
}

export interface GrantCreditsOutput {
  readonly grant: CreditGrant;
  readonly ledgerEntry: LedgerEntry;
  readonly balance: CreditBalance;
}

export type GrantCreditsError = CreditError | Error;

export async function grantCreditsFlow(
  input: GrantCreditsInput,
  deps: GrantCreditsDeps,
): Promise<Result<GrantCreditsOutput, GrantCreditsError>> {
  const { store, clock, logger, notifier } = deps;
  const now = clock.nowIso();

  const grant = makeGrant({
    userId: input.userId,
    amount: input.amount,
    source: input.source,
    reason: input.reason,
    grantedAt: now,
    expiresAt: input.expiresAt,
    metadata: input.metadata ?? {},
  });

  const saveGrantResult = await store.saveGrant(grant);
  if (!saveGrantResult.ok) return err(saveGrantResult.error);

  const ledgerEntry = makeLedgerEntry({
    userId: input.userId,
    kind: "grant",
    delta: input.amount,
    grantId: grant.id,
    referenceId: null,
    note: input.reason,
    recordedAt: now,
  });

  const saveLedgerResult = await store.appendLedgerEntry(ledgerEntry);
  if (!saveLedgerResult.ok) return err(saveLedgerResult.error);

  const balanceResult = await store.getBalance(input.userId);
  if (!balanceResult.ok) return err(balanceResult.error);

  const existing = balanceResult.value ?? zeroBalance(input.userId, now);
  const updatedBalance = applyGrant(existing, input.amount, now);

  const saveBalanceResult = await store.saveBalance(updatedBalance);
  if (!saveBalanceResult.ok) return err(saveBalanceResult.error);

  logger.info("Credits granted", {
    userId: input.userId,
    grantId: grant.id,
    amount: String(input.amount),
    source: input.source,
  });

  if (notifier !== undefined) {
    await notifier.notifyGrantIssued(input.userId, grant);
  }

  return ok({ grant, ledgerEntry, balance: updatedBalance });
}
