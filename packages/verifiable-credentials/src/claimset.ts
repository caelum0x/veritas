// Map between VerificationReport claims and VC credentialSubject claim arrays.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { ReportClaim } from "@veritas/contracts";
import { InvalidCredentialSubjectError } from "./errors.js";

/** A compact claim representation embedded in a VC subject. */
export interface VcClaim {
  readonly text: string;
  readonly verdict: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly citationIds: readonly string[];
}

/** Zod schema for VcClaim. */
export const VcClaimSchema = z.object({
  text: z.string().min(1),
  verdict: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  citationIds: z.array(z.string()),
});

/** Zod schema for an array of VcClaim. */
export const VcClaimArraySchema = z.array(VcClaimSchema);

/**
 * Convert an array of ReportClaim (from @veritas/contracts) into VcClaim objects
 * suitable for embedding in a credential subject.
 */
export function reportClaimsToVcClaims(claims: readonly ReportClaim[]): readonly VcClaim[] {
  return claims.map((c) => ({
    text: c.claim,
    verdict: c.verdict,
    confidence: c.confidence,
    reasoning: c.reasoning,
    citationIds: c.citationIds,
  }));
}

/**
 * Parse and validate an unknown value as an array of VcClaim.
 * Returns an error if validation fails.
 */
export function parseVcClaims(
  raw: unknown,
): Result<readonly VcClaim[], InvalidCredentialSubjectError> {
  const result = VcClaimArraySchema.safeParse(raw);
  if (!result.success) {
    return err(
      new InvalidCredentialSubjectError(
        `Invalid VC claims payload: ${result.error.message}`,
      ),
    );
  }
  return ok(result.data);
}

/**
 * Convert VcClaim objects back to a shape compatible with ReportClaim.
 * Suitable for reconstructing report data from a credential subject.
 */
export function vcClaimsToReportClaims(claims: readonly VcClaim[]): readonly ReportClaim[] {
  return claims.map((c) => ({
    claim: c.text,
    verdict: c.verdict as ReportClaim["verdict"],
    confidence: c.confidence,
    reasoning: c.reasoning,
    citationIds: c.citationIds as string[],
  }));
}

/**
 * Group VcClaims by verdict value.
 * Returns a record keyed by verdict string with arrays of matching claims.
 */
export function groupClaimsByVerdict(
  claims: readonly VcClaim[],
): Readonly<Record<string, readonly VcClaim[]>> {
  const groups: Record<string, VcClaim[]> = {};
  for (const claim of claims) {
    const key = claim.verdict;
    const existing = groups[key];
    if (existing !== undefined) {
      existing.push(claim);
    } else {
      groups[key] = [claim];
    }
  }
  return groups;
}
