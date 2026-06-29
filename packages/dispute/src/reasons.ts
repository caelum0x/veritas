// Dispute reasons: enumeration and metadata for why a dispute is raised.

import { z } from "zod";

export const DISPUTE_REASONS = [
  "incorrect_verdict",
  "missing_evidence",
  "source_bias",
  "methodology_flaw",
  "conflict_of_interest",
  "factual_error",
  "out_of_scope",
  "procedural_violation",
  "other",
] as const;

export const DisputeReasonSchema = z.enum(DISPUTE_REASONS);
export type DisputeReason = z.infer<typeof DisputeReasonSchema>;

export type DisputeReasonMeta = {
  readonly reason: DisputeReason;
  readonly label: string;
  readonly description: string;
  readonly requiresEvidence: boolean;
};

export const REASON_META: Record<DisputeReason, DisputeReasonMeta> = {
  incorrect_verdict: {
    reason: "incorrect_verdict",
    label: "Incorrect Verdict",
    description: "The verdict assigned to the claim does not match the evidence.",
    requiresEvidence: true,
  },
  missing_evidence: {
    reason: "missing_evidence",
    label: "Missing Evidence",
    description: "Key sources or evidence were not considered during verification.",
    requiresEvidence: true,
  },
  source_bias: {
    reason: "source_bias",
    label: "Source Bias",
    description: "One or more sources used exhibit demonstrable bias.",
    requiresEvidence: true,
  },
  methodology_flaw: {
    reason: "methodology_flaw",
    label: "Methodology Flaw",
    description: "The verification methodology was applied incorrectly.",
    requiresEvidence: false,
  },
  conflict_of_interest: {
    reason: "conflict_of_interest",
    label: "Conflict of Interest",
    description: "A reviewer had an undisclosed conflict of interest.",
    requiresEvidence: false,
  },
  factual_error: {
    reason: "factual_error",
    label: "Factual Error",
    description: "A factual inaccuracy is present in the verification report.",
    requiresEvidence: true,
  },
  out_of_scope: {
    reason: "out_of_scope",
    label: "Out of Scope",
    description: "The claim falls outside the agreed scope of verification.",
    requiresEvidence: false,
  },
  procedural_violation: {
    reason: "procedural_violation",
    label: "Procedural Violation",
    description: "The verification process violated established procedures.",
    requiresEvidence: false,
  },
  other: {
    reason: "other",
    label: "Other",
    description: "A reason not covered by other categories.",
    requiresEvidence: false,
  },
};

export function getReasonMeta(reason: DisputeReason): DisputeReasonMeta {
  return REASON_META[reason];
}

export function requiresEvidence(reason: DisputeReason): boolean {
  return REASON_META[reason].requiresEvidence;
}
