// Trial eligibility checks — determines whether a user may start a trial.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ForbiddenError } from "@veritas/core";
import type { UserId } from "@veritas/core";
import type { TrialStore } from "./store.js";
import type { TrialPolicy } from "./policy.js";

/** Reason a user is ineligible for a trial. */
export type IneligibilityReason =
  | "ALREADY_ACTIVE"
  | "ALREADY_USED"
  | "CREDIT_CARD_REQUIRED";

/** Detailed eligibility result. */
export interface EligibilityResult {
  readonly eligible: boolean;
  readonly reason: IneligibilityReason | null;
}

/** Check whether a user is eligible to start a trial under the given policy. */
export async function checkEligibility(
  userId: UserId,
  policy: TrialPolicy,
  store: TrialStore,
  hasCreditCard: boolean
): Promise<Result<EligibilityResult, never>> {
  // Credit card gate first — cheapest check.
  if (policy.requiresCreditCard && !hasCreditCard) {
    return ok({ eligible: false, reason: "CREDIT_CARD_REQUIRED" });
  }

  const trialsResult = await store.findByUserId(userId);
  if (!trialsResult.ok) {
    return ok({ eligible: true, reason: null });
  }

  const trials = trialsResult.value;

  // Check for currently active trial.
  const hasActive = trials.some(
    (t) => t.status === "active" || t.status === "extended"
  );
  if (hasActive) {
    return ok({ eligible: false, reason: "ALREADY_ACTIVE" });
  }

  // Enforce once-per-lifetime policy.
  if (policy.allowedOnce) {
    const hasUsed = trials.some(
      (t) =>
        t.planId === policy.planId &&
        (t.status === "converted" ||
          t.status === "expired" ||
          t.status === "cancelled")
    );
    if (hasUsed) {
      return ok({ eligible: false, reason: "ALREADY_USED" });
    }
  }

  return ok({ eligible: true, reason: null });
}

/** Assert eligibility, returning a ForbiddenError if not eligible. */
export async function assertEligible(
  userId: UserId,
  policy: TrialPolicy,
  store: TrialStore,
  hasCreditCard: boolean
): Promise<Result<true, ForbiddenError>> {
  const result = await checkEligibility(userId, policy, store, hasCreditCard);
  if (!result.ok) return result as unknown as Result<true, ForbiddenError>;

  const { eligible, reason } = result.value;
  if (!eligible) {
    return err(
      new ForbiddenError({
        message: `User is not eligible for a trial: ${reason ?? "unknown"}`,
        details: { userId, reason },
      })
    );
  }

  return ok(true);
}
