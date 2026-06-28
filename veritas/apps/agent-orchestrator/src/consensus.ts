// consensus: compute agreement across multiple agent verdicts and surface conflicts.

import { ok, err } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { InternalError } from "@veritas/core";
import type { VerificationReport, VerificationReportClaim } from "@veritas/contracts";

/** Per-claim consensus result. */
export interface ClaimConsensus {
  readonly claimText: string;
  readonly agreedVerdict: string | null;
  readonly agreementRate: number;
  readonly conflicting: boolean;
  readonly verdictCounts: Record<string, number>;
}

/** Overall consensus across all contributing agents. */
export interface ConsensusResult {
  readonly overallAgreementRate: number;
  readonly claimsWithConsensus: number;
  readonly claimsConflicting: number;
  readonly perClaim: readonly ClaimConsensus[];
}

/** Options for tuning the consensus calculation. */
export interface ConsensusOptions {
  /** Minimum fraction of agents that must agree for a verdict to be considered consensus (default 0.6). */
  readonly quorum?: number;
}

/**
 * Compute verdict consensus across a set of VerificationReports.
 * Returns per-claim agreement rates and flags conflicts below the quorum threshold.
 */
export function computeConsensus(
  reports: readonly VerificationReport[],
  options: ConsensusOptions = {},
): Result<ConsensusResult, AppError> {
  const quorum = options.quorum ?? 0.6;

  if (reports.length === 0) {
    return err(
      new InternalError({ message: "computeConsensus: no reports provided" }) as AppError,
    );
  }

  // Group claims by normalised text across all reports.
  const claimMap = new Map<string, string[]>();

  for (const report of reports) {
    for (const claim of report.claims ?? []) {
      const key = claim.claim.trim().toLowerCase();
      const existing = claimMap.get(key) ?? [];
      claimMap.set(key, [...existing, claim.verdict]);
    }
  }

  const perClaim: ClaimConsensus[] = [];
  let totalAgreement = 0;

  for (const [claimText, verdicts] of claimMap) {
    const counts = tallyVerdicts(verdicts);
    const topVerdict = topByCount(counts);
    const topCount = topVerdict !== null ? (counts[topVerdict] ?? 0) : 0;
    const agreementRate = verdicts.length > 0 ? topCount / verdicts.length : 0;
    const conflicting = agreementRate < quorum;

    perClaim.push({
      claimText,
      agreedVerdict: conflicting ? null : topVerdict,
      agreementRate,
      conflicting,
      verdictCounts: counts,
    });

    totalAgreement += agreementRate;
  }

  const overallAgreementRate = perClaim.length > 0 ? totalAgreement / perClaim.length : 1;
  const claimsWithConsensus = perClaim.filter((c) => !c.conflicting).length;
  const claimsConflicting = perClaim.filter((c) => c.conflicting).length;

  return ok({
    overallAgreementRate,
    claimsWithConsensus,
    claimsConflicting,
    perClaim,
  });
}

/** Tally verdict strings into a count map. */
function tallyVerdicts(verdicts: readonly string[]): Record<string, number> {
  return verdicts.reduce<Record<string, number>>((acc, v) => {
    return { ...acc, [v]: (acc[v] ?? 0) + 1 };
  }, {});
}

/** Return the key with the highest count (null if map is empty). */
function topByCount(counts: Record<string, number>): string | null {
  let top: string | null = null;
  let max = -1;
  for (const [key, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      top = key;
    }
  }
  return top;
}

/**
 * Quick helper: given a list of VerificationReports, determine whether
 * they satisfy the quorum threshold required before results are surfaced.
 */
export function hasConsensus(
  reports: readonly VerificationReport[],
  options: ConsensusOptions = {},
): boolean {
  const result = computeConsensus(reports, options);
  if (!result.ok) return false;
  return result.value.claimsConflicting === 0;
}
