// attribution.ts: attribute new signups to referral codes within program window.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { type Referral, attributeReferral } from "./referral.js";
import { type ReferralProgram, isProgramActive } from "./program.js";

export const AttributionRequestSchema = z.object({
  refereeId: z.string().min(1),
  refereeEmail: z.string().email(),
  refereeCreatedAt: z.string().datetime(),
  refereeEmailVerified: z.boolean(),
  code: z.string().min(1),
});

export type AttributionRequest = z.infer<typeof AttributionRequestSchema>;

export interface FraudSignals {
  readonly isSelfReferral: boolean;
  readonly isDuplicateReferee: boolean;
  readonly suspiciousIp: boolean;
  readonly reason?: string;
}

export type AttributionError =
  | { kind: "program_inactive" }
  | { kind: "program_not_found" }
  | { kind: "referral_not_found" }
  | { kind: "already_attributed" }
  | { kind: "window_expired" }
  | { kind: "email_not_verified" }
  | { kind: "min_age_not_met" }
  | { kind: "fraud_detected"; reason: string };

export function checkAttributionEligibility(
  program: ReferralProgram,
  referral: Referral,
  request: AttributionRequest,
  fraudSignals: FraudSignals,
): Result<true, AttributionError> {
  if (!isProgramActive(program)) {
    return err({ kind: "program_inactive" });
  }

  if (referral.status !== "pending") {
    return err({ kind: "already_attributed" });
  }

  if (program.requireVerifiedEmail && !request.refereeEmailVerified) {
    return err({ kind: "email_not_verified" });
  }

  const clickedAt = new Date(referral.clickedAt).getTime();
  const signedUpAt = new Date(request.refereeCreatedAt).getTime();
  const windowMs = program.attributionWindowDays * 24 * 60 * 60 * 1000;

  if (signedUpAt - clickedAt > windowMs) {
    return err({ kind: "window_expired" });
  }

  if (program.minAccountAgeDays > 0) {
    const ageMs = Date.now() - new Date(request.refereeCreatedAt).getTime();
    const requiredMs = program.minAccountAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < requiredMs) {
      return err({ kind: "min_age_not_met" });
    }
  }

  if (fraudSignals.isSelfReferral || fraudSignals.isDuplicateReferee || fraudSignals.suspiciousIp) {
    return err({
      kind: "fraud_detected",
      reason: fraudSignals.reason ?? buildFraudReason(fraudSignals),
    });
  }

  return ok(true);
}

function buildFraudReason(signals: FraudSignals): string {
  const reasons: string[] = [];
  if (signals.isSelfReferral) reasons.push("self-referral");
  if (signals.isDuplicateReferee) reasons.push("duplicate referee");
  if (signals.suspiciousIp) reasons.push("suspicious IP");
  return reasons.join(", ");
}

export function performAttribution(referral: Referral, refereeId: string): Referral {
  return attributeReferral(referral, refereeId);
}
