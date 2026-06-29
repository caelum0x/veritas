// fraud-check.ts: detect self-referral and duplicate-referral fraud patterns.
import { Result, ok, err } from "@veritas/core";
import { Referral } from "./referral.js";
import { ReferralProgram } from "./program.js";
import { SelfReferralError, DuplicateReferralError, FraudSuspectedError } from "./errors.js";

export interface FraudCheckInput {
  readonly referrerId: string;
  readonly refereeId: string;
  readonly code: string;
  readonly program: ReferralProgram;
  readonly existingReferrals: readonly Referral[];
  readonly refereeAccountCreatedAt: string;
  readonly refereeIp?: string;
  readonly referrerIp?: string;
}

export interface FraudCheckResult {
  readonly passed: boolean;
  readonly reason?: string;
}

/** Returns ok(FraudCheckResult) always; use result.passed to gate referral flow. */
export function runFraudChecks(input: FraudCheckInput): Result<FraudCheckResult> {
  const selfReferral = checkSelfReferral(input);
  if (!selfReferral.passed) return ok(selfReferral);

  const duplicate = checkDuplicateReferral(input);
  if (!duplicate.passed) return ok(duplicate);

  const ipMatch = checkIpOverlap(input);
  if (!ipMatch.passed) return ok(ipMatch);

  const accountAge = checkMinAccountAge(input);
  if (!accountAge.passed) return ok(accountAge);

  return ok({ passed: true });
}

/** Strict variant — returns Err on any fraud detection. */
export function assertNoFraud(input: FraudCheckInput): Result<void> {
  if (!input.program.allowSelfReferral && input.referrerId === input.refereeId) {
    return err(new SelfReferralError(input.refereeId));
  }

  const alreadyReferred = input.existingReferrals.some(
    (r) => r.refereeId === input.refereeId && r.status !== "fraud" && r.status !== "expired",
  );
  if (alreadyReferred) {
    return err(new DuplicateReferralError(input.referrerId, input.refereeId));
  }

  if (input.refereeIp && input.referrerIp && input.refereeIp === input.referrerIp) {
    return err(new FraudSuspectedError("Referrer and referee share the same IP address"));
  }

  if (input.program.minAccountAgeDays > 0) {
    const created = new Date(input.refereeAccountCreatedAt).getTime();
    const ageMs = Date.now() - created;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < input.program.minAccountAgeDays) {
      return err(
        new FraudSuspectedError(
          `Referee account age ${Math.floor(ageDays)}d is below minimum ${input.program.minAccountAgeDays}d`,
        ),
      );
    }
  }

  return ok(undefined);
}

function checkSelfReferral(input: FraudCheckInput): FraudCheckResult {
  if (!input.program.allowSelfReferral && input.referrerId === input.refereeId) {
    return { passed: false, reason: "Self-referral is not permitted" };
  }
  return { passed: true };
}

function checkDuplicateReferral(input: FraudCheckInput): FraudCheckResult {
  const isDuplicate = input.existingReferrals.some(
    (r) => r.refereeId === input.refereeId && r.status !== "fraud" && r.status !== "expired",
  );
  if (isDuplicate) {
    return { passed: false, reason: "Referee has already been attributed to a referral" };
  }
  return { passed: true };
}

function checkIpOverlap(input: FraudCheckInput): FraudCheckResult {
  if (input.refereeIp && input.referrerIp && input.refereeIp === input.referrerIp) {
    return { passed: false, reason: "Referrer and referee share the same IP address" };
  }
  return { passed: true };
}

function checkMinAccountAge(input: FraudCheckInput): FraudCheckResult {
  if (input.program.minAccountAgeDays <= 0) return { passed: true };
  const created = new Date(input.refereeAccountCreatedAt).getTime();
  const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
  if (ageDays < input.program.minAccountAgeDays) {
    return {
      passed: false,
      reason: `Account age ${Math.floor(ageDays)}d is below minimum ${input.program.minAccountAgeDays}d`,
    };
  }
  return { passed: true };
}
