// Merge specialized verifier signals into a single aggregated verdict for the core engine.
import { ok, err, type Result } from "@veritas/core";
import { aggregateSignals, type AggregatedVerdictResult } from "@veritas/verifier-kit";
import type { DispatchOutcome } from "./dispatch.js";
import { applyDomainWeights, normaliseWeights } from "./weighting.js";
import { MergeError } from "./errors.js";
import type { EvidenceBundle, VerdictSignal } from "@veritas/verifier-kit";

/** The merged output passed back to the core verification engine. */
export interface MergedResult {
  readonly claimId: string;
  readonly domain: string;
  readonly aggregated: AggregatedVerdictResult;
  readonly signals: ReadonlyArray<VerdictSignal>;
  readonly evidenceBundles: ReadonlyArray<EvidenceBundle>;
  readonly verifierIds: ReadonlyArray<string>;
  readonly mergedAt: string;
}

/** Collect signals from all successful dispatch outcomes and aggregate them. */
export function mergeOutcomes(
  claimId: string,
  domain: string,
  outcomes: ReadonlyArray<DispatchOutcome>,
): Result<MergedResult> {
  try {
    const rawSignals: VerdictSignal[] = [];
    const evidenceBundles: EvidenceBundle[] = [];
    const verifierIds: string[] = [];

    for (const outcome of outcomes) {
      if (outcome.result.ok) {
        const output = outcome.result.value;
        rawSignals.push(...output.signals);
        evidenceBundles.push(output.evidence);
        verifierIds.push(outcome.verifierId);
      }
    }

    const domainWeighted = applyDomainWeights(rawSignals, domain);
    const normalised = normaliseWeights(domainWeighted);
    const aggregated = aggregateSignals(normalised);

    return ok({
      claimId,
      domain,
      aggregated,
      signals: normalised,
      evidenceBundles,
      verifierIds,
      mergedAt: new Date().toISOString(),
    });
  } catch (e) {
    return err(new MergeError(claimId, e instanceof Error ? e.message : String(e)));
  }
}
