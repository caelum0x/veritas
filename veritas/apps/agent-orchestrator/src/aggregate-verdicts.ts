// aggregateVerdicts: merge verdicts from multiple VerificationReports into a single authoritative report.

import { ok, err, newVerificationId, epochToIso, clampScore, meanScore, asScore } from "@veritas/core";
import type { Result, AppError, IsoTimestamp } from "@veritas/core";
import type { VerificationReport, VerificationReportClaim } from "@veritas/contracts";
import { InternalError } from "@veritas/core";

/** A single agent's report contribution along with its weight. */
export interface WeightedReport {
  readonly report: VerificationReport;
  /** 0–1 weight applied to this report's trustScore during aggregation. */
  readonly weight: number;
}

/** Options controlling how verdicts are merged. */
export interface AggregationOptions {
  /** Minimum number of reports required before aggregation proceeds (default 1). */
  readonly minReports?: number;
  /** Strategy: "weighted-mean" uses weight, "majority" picks the verdict most agents agree on. */
  readonly strategy?: "weighted-mean" | "majority";
}

/** The merged report output. */
export interface AggregatedResult {
  readonly report: VerificationReport;
  readonly contributingAgents: number;
  readonly agreementRate: number;
}

/**
 * Merge weighted verdicts from multiple agents into a single VerificationReport.
 * Claims are merged by normalised text; trustScore is a weighted mean across all reports.
 */
export function aggregateVerdicts(
  weightedReports: readonly WeightedReport[],
  options: AggregationOptions = {},
): Result<AggregatedResult, AppError> {
  const minReports = options.minReports ?? 1;
  const strategy = options.strategy ?? "weighted-mean";

  if (weightedReports.length < minReports) {
    return err(
      new InternalError({
        message: `aggregateVerdicts: need at least ${minReports} report(s), got ${weightedReports.length}`,
      }) as AppError,
    );
  }

  if (weightedReports.length === 0) {
    return err(
      new InternalError({ message: "aggregateVerdicts: no reports provided" }) as AppError,
    );
  }

  const totalWeight = weightedReports.reduce((s, r) => s + r.weight, 0);
  if (totalWeight <= 0) {
    return err(
      new InternalError({ message: "aggregateVerdicts: total weight must be > 0" }) as AppError,
    );
  }

  // Compute weighted trust score.
  const weightedTrustScore = weightedReports.reduce((sum, { report, weight }) => {
    const score = typeof report.trustScore === "number" ? report.trustScore : 0;
    return sum + score * (weight / totalWeight);
  }, 0);

  // Merge claims across reports — group by normalised claim text.
  const claimMap = new Map<string, VerificationReportClaim[]>();

  for (const { report } of weightedReports) {
    for (const claim of report.claims ?? []) {
      const key = claim.claim.trim().toLowerCase();
      const existing = claimMap.get(key) ?? [];
      claimMap.set(key, [...existing, claim]);
    }
  }

  const mergedClaims: VerificationReportClaim[] = [];
  let totalAgreements = 0;
  let totalPairs = 0;

  for (const [, claimVariants] of claimMap) {
    const merged = mergeClaims(claimVariants, strategy);
    mergedClaims.push(merged);

    const verdicts = claimVariants.map((c) => c.verdict);
    totalPairs += verdicts.length;
    const majorityVerdict = merged.verdict;
    totalAgreements += verdicts.filter((v) => v === majorityVerdict).length;
  }

  const agreementRate = totalPairs > 0 ? totalAgreements / totalPairs : 1;

  // Build aggregated report from first report as template (immutably).
  const firstEntry = weightedReports[0];
  if (firstEntry === undefined) {
    return err(new InternalError({ message: "aggregateVerdicts: unexpected empty reports" }) as AppError);
  }
  const template = firstEntry.report;
  const now: IsoTimestamp = epochToIso(Date.now());

  const aggregatedReport: VerificationReport = {
    ...template,
    id: newVerificationId(),
    trustScore: clampScore(weightedTrustScore),
    claims: mergedClaims,
    createdAt: now,
    updatedAt: now,
  } as VerificationReport;

  return ok({
    report: aggregatedReport,
    contributingAgents: weightedReports.length,
    agreementRate,
  });
}

/** Merge multiple claim variants into one, selecting verdict by majority or weighted mean confidence. */
function mergeClaims(
  variants: readonly VerificationReportClaim[],
  strategy: "weighted-mean" | "majority",
): VerificationReportClaim {
  const first = variants[0];
  if (first === undefined) {
    // Should never happen — callers ensure non-empty arrays.
    throw new Error("mergeClaims: variants must be non-empty");
  }
  if (variants.length === 1) return first;

  const verdictCounts = new Map<string, number>();
  for (const v of variants) {
    verdictCounts.set(v.verdict, (verdictCounts.get(v.verdict) ?? 0) + 1);
  }

  let winningVerdict = first.verdict;
  if (strategy === "majority") {
    let maxCount = 0;
    for (const [verdict, count] of verdictCounts) {
      if (count > maxCount) {
        maxCount = count;
        winningVerdict = verdict as typeof winningVerdict;
      }
    }
  }

  const confidences = variants.map((v) => asScore(v.confidence ?? 0));
  const avgConfidence = meanScore(confidences);

  return {
    ...first,
    verdict: winningVerdict,
    confidence: clampScore(avgConfidence),
  } as VerificationReportClaim;
}
