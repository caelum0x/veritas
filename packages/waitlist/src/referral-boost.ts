// Jump queue via referral: apply boost points when a referral code is used
import { Result, ok, err } from "@veritas/core";
import type { WaitlistStore } from "./store.js";
import type { WaitlistEntry } from "./types.js";
import { WaitlistNotFoundError, InvalidReferralCodeError } from "./errors.js";

export interface ApplyReferralBoostResult {
  readonly referrer: WaitlistEntry;
  readonly referee: WaitlistEntry;
  readonly pointsAwarded: number;
}

/**
 * Awards boost points to the referrer when a referred entry joins.
 * Called after a new entry with referredByCode is created.
 */
export function applyReferralBoost(
  store: WaitlistStore,
  refereeId: string,
): Result<ApplyReferralBoostResult> {
  const referee = store.getEntry(refereeId);
  if (!referee) return err(new WaitlistNotFoundError(refereeId));

  const { referredByCode, waitlistId } = referee;
  if (!referredByCode) {
    return err(new InvalidReferralCodeError(""));
  }

  const referrer = store.getEntryByReferralCode(referredByCode);
  if (!referrer) return err(new InvalidReferralCodeError(referredByCode));

  const waitlist = store.getWaitlist(waitlistId);
  if (!waitlist) return err(new WaitlistNotFoundError(waitlistId));

  const pointsAwarded = waitlist.referralBoostPoints;
  const now = new Date().toISOString();

  const updatedReferrer: WaitlistEntry = {
    ...referrer,
    boostPoints: referrer.boostPoints + pointsAwarded,
    updatedAt: now,
  };

  store.saveEntry(updatedReferrer);

  return ok({ referrer: updatedReferrer, referee, pointsAwarded });
}

/**
 * Returns total boost points accumulated by an entry.
 */
export function getBoostPoints(
  store: WaitlistStore,
  entryId: string,
): Result<number> {
  const entry = store.getEntry(entryId);
  if (!entry) return err(new WaitlistNotFoundError(entryId));
  return ok(entry.boostPoints);
}
