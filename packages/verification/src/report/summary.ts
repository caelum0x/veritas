// Generate a human-readable summary paragraph from a VerificationReport.

import type { VerificationReport } from "@veritas/contracts";

/** Threshold below which the content is considered low-trust. */
const LOW_TRUST_THRESHOLD = 40;
/** Threshold above which the content is considered high-trust. */
const HIGH_TRUST_THRESHOLD = 75;

/** Format the overall trust level as a qualitative label. */
function trustLabel(score: number): string {
  if (score >= HIGH_TRUST_THRESHOLD) return "high";
  if (score >= LOW_TRUST_THRESHOLD) return "moderate";
  return "low";
}

/** Build a readable breakdown sentence from verdict counts. */
function buildBreakdown(supported: number, refuted: number, unverifiable: number): string {
  const parts: string[] = [];
  if (supported > 0) {
    parts.push(`${supported} supported`);
  }
  if (refuted > 0) {
    parts.push(`${refuted} refuted`);
  }
  if (unverifiable > 0) {
    parts.push(`${unverifiable} unverifiable`);
  }
  if (parts.length === 0) return "no outcomes recorded";
  if (parts.length === 1) return parts[0]!;
  const last = parts.pop()!;
  return `${parts.join(", ")} and ${last}`;
}

/** Return the dominant verdict as a narrative phrase. */
function dominantVerdict(supported: number, refuted: number, unverifiable: number): string {
  if (supported > refuted && supported > unverifiable) {
    return "The content is generally well-supported by available sources.";
  }
  if (refuted > supported && refuted > unverifiable) {
    return "Multiple claims were contradicted by available evidence.";
  }
  if (unverifiable > supported && unverifiable > refuted) {
    return "Many claims could not be verified against available sources.";
  }
  return "Evidence was mixed across the claims examined.";
}

/**
 * Build a concise human-readable summary for the given VerificationReport.
 * The summary is suitable for display at the top of a report or in a UI widget.
 */
export function buildSummary(report: VerificationReport): string {
  const { trustScore, counts, claims } = report;
  const total = claims.length;

  if (total === 0) {
    return "No verifiable claims were detected in the submitted content.";
  }

  const { supported, refuted, unverifiable } = counts;
  const label = trustLabel(trustScore);
  const breakdown = buildBreakdown(supported, refuted, unverifiable);
  const claimWord = total === 1 ? "claim" : "claims";
  const dominant = dominantVerdict(supported, refuted, unverifiable);

  return (
    `Analysis of ${total} ${claimWord} yielded an overall trust score of ${trustScore}/100 (${label} trust). ` +
    `Verdict breakdown: ${breakdown}. ` +
    dominant
  );
}
