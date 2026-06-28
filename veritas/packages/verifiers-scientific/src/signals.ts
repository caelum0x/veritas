// Scientific verdict signals: domain-specific signal factories for the scientific verifier.

import { Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { PubMedEvidence, CrossrefEvidence, ArxivEvidence, RetractionEvidence } from "./evidence.js";

const VERIFIER_ID = "verifiers-scientific";

/** Signal: peer-reviewed paper directly supports the claim. */
export function peerReviewedSupportSignal(
  evidence: PubMedEvidence | CrossrefEvidence,
  confidence: number,
): VerdictSignal {
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.SUPPORTED,
    confidence,
    rationale: `Peer-reviewed publication "${evidence.metadata.title}" supports the claim.`,
    sources: [evidence.sourceUri],
    weight: 0.85,
  });
}

/** Signal: retraction notice refutes the claim or its cited source. */
export function retractionRefuteSignal(retraction: RetractionEvidence): VerdictSignal {
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.REFUTED,
    confidence: 0.92,
    rationale: `Retraction notice found for "${retraction.metadata.title}": ${retraction.metadata.retractionReason}`,
    sources: [retraction.sourceUri],
    weight: 1.0,
  });
}

/** Signal: arXiv preprint provides tentative support but is not peer-reviewed. */
export function preprintSupportSignal(evidence: ArxivEvidence, confidence: number): VerdictSignal {
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.SUPPORTED,
    confidence: confidence * 0.6, // reduced because preprints are not peer-reviewed
    rationale: `arXiv preprint "${evidence.metadata.title}" supports the claim (not peer-reviewed).`,
    sources: [evidence.sourceUri],
    weight: 0.4,
  });
}

/** Signal: no relevant literature found — unverifiable. */
export function noLiteratureSignal(): VerdictSignal {
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.UNVERIFIABLE,
    confidence: 0.7,
    rationale: "No relevant peer-reviewed literature found for this scientific claim.",
    sources: [],
    weight: 0.5,
  });
}

/** Signal: high citation count increases confidence in a supporting signal. */
export function highCitationBoostSignal(
  title: string,
  citationCount: number,
  sourceUri: string,
): VerdictSignal {
  const confidence = Math.min(0.95, 0.6 + citationCount / 1000);
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.SUPPORTED,
    confidence,
    rationale: `High-citation work (${citationCount} citations) "${title}" corroborates the claim.`,
    sources: [sourceUri],
    weight: 0.75,
  });
}

/** Signal: conflicting findings across multiple papers. */
export function conflictingLiteratureSignal(paperTitles: ReadonlyArray<string>): VerdictSignal {
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict: Verdict.UNVERIFIABLE,
    confidence: 0.55,
    rationale: `Conflicting findings across literature: ${paperTitles.slice(0, 3).join("; ")}`,
    sources: [],
    weight: 0.6,
  });
}
