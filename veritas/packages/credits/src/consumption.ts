// Consume credits: deduct from available grants in FIFO expiry order.

import { type UserId, type Result, ok, err } from "@veritas/core";
import { type CreditAmount } from "./credit.js";
import { type CreditGrant, deductFromGrant, isGrantExpired } from "./grant.js";
import { makeLedgerEntry, type LedgerEntry } from "./ledger.js";
import { InsufficientCreditsError } from "./errors.js";

/** Result of a credit consumption operation. */
export interface ConsumptionResult {
  readonly consumed: CreditAmount;
  readonly updatedGrants: ReadonlyArray<CreditGrant>;
  readonly ledgerEntries: ReadonlyArray<LedgerEntry>;
}

/** Sort grants so soonest-expiring (or oldest if no expiry) are consumed first. */
function sortGrantsByExpiry(grants: ReadonlyArray<CreditGrant>): ReadonlyArray<CreditGrant> {
  return [...grants].sort((a, b) => {
    if (a.expiresAt === null && b.expiresAt === null) return 0;
    if (a.expiresAt === null) return 1;
    if (b.expiresAt === null) return -1;
    return a.expiresAt < b.expiresAt ? -1 : a.expiresAt > b.expiresAt ? 1 : 0;
  });
}

/**
 * Consume `amount` credits from a user's grants using FIFO expiry ordering.
 * Returns an error if insufficient credits are available.
 */
export function consumeCredits(
  userId: UserId,
  amount: CreditAmount,
  grants: ReadonlyArray<CreditGrant>,
  referenceId: string,
  note: string,
  now: string,
): Result<ConsumptionResult, InsufficientCreditsError> {
  const activeGrants = grants.filter(
    (g) => !isGrantExpired(g, now) && g.remaining > 0,
  );

  const totalAvailable = activeGrants.reduce(
    (sum, g) => sum + g.remaining,
    0,
  ) as CreditAmount;

  if (totalAvailable < amount) {
    return err(new InsufficientCreditsError(amount, totalAvailable));
  }

  const sorted = sortGrantsByExpiry(activeGrants);
  const inactiveGrants = grants.filter((g) => isGrantExpired(g, now) || g.remaining === 0);
  const updatedGrants: CreditGrant[] = [...inactiveGrants];
  const ledgerEntries: LedgerEntry[] = [];
  let remaining = amount;

  for (const grant of sorted) {
    if (remaining <= 0) {
      updatedGrants.push(grant);
      continue;
    }
    const deduct = Math.min(grant.remaining, remaining) as CreditAmount;
    const updated = deductFromGrant(grant, deduct);
    updatedGrants.push(updated);
    remaining = (remaining - deduct) as CreditAmount;
    ledgerEntries.push(
      makeLedgerEntry({
        userId,
        kind: "consume",
        delta: -deduct,
        grantId: grant.id,
        referenceId,
        note,
        recordedAt: now,
      }),
    );
  }

  return ok(
    Object.freeze({
      consumed: amount,
      updatedGrants: Object.freeze(updatedGrants),
      ledgerEntries: Object.freeze(ledgerEntries),
    }),
  );
}
