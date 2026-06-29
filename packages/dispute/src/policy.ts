// Dispute policy: configurable rules governing eligibility, deadlines, and fees.

import { z } from "zod";
import { Usdc } from "@veritas/core";
import type { DisputeReason } from "./reasons.js";

export const DisputePolicySchema = z.object({
  /** Hours a respondent has to reply before auto-escalation. */
  responseWindowHours: z.number().int().positive().default(48),
  /** Hours arbitration panel has to render a verdict. */
  arbitrationWindowHours: z.number().int().positive().default(168),
  /** Non-refundable fee in USDC base units required to open a dispute. */
  filingFeeUsdc: z.bigint().nonnegative().default(0n),
  /** If true, filing fee is returned on successful dispute. */
  refundFeeOnSuccess: z.boolean().default(true),
  /** Reasons that are eligible for this policy. Empty = all reasons allowed. */
  allowedReasons: z
    .array(z.string())
    .default([]),
  /** Max number of evidence items per party. */
  maxEvidenceItemsPerParty: z.number().int().positive().default(10),
  /** Whether disputes automatically close if the respondent does not reply. */
  autoCloseOnNoResponse: z.boolean().default(false),
});

export type DisputePolicy = z.infer<typeof DisputePolicySchema>;

export const DEFAULT_DISPUTE_POLICY: DisputePolicy = {
  responseWindowHours: 48,
  arbitrationWindowHours: 168,
  filingFeeUsdc: 0n,
  refundFeeOnSuccess: true,
  allowedReasons: [],
  maxEvidenceItemsPerParty: 10,
  autoCloseOnNoResponse: false,
};

export function isReasonAllowed(
  policy: DisputePolicy,
  reason: DisputeReason,
): boolean {
  if (policy.allowedReasons.length === 0) return true;
  return policy.allowedReasons.includes(reason);
}

export function filingFee(policy: DisputePolicy): Usdc {
  return Usdc.fromBaseUnits(policy.filingFeeUsdc);
}

export function responseDeadline(
  openedAt: string,
  policy: DisputePolicy,
): Date {
  const ms = policy.responseWindowHours * 3_600_000;
  return new Date(new Date(openedAt).getTime() + ms);
}

export function arbitrationDeadline(
  escalatedAt: string,
  policy: DisputePolicy,
): Date {
  const ms = policy.arbitrationWindowHours * 3_600_000;
  return new Date(new Date(escalatedAt).getTime() + ms);
}
