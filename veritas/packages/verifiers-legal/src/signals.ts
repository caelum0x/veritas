// Legal verdict signals: derive weighted verdict signals from legal evidence results.

import { type Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { LegalEvidenceResult } from "./evidence.js";

const VERIFIER_ID = "veritas-legal";

/** Derive a verdict from support vs refute balance across items. */
function deriveVerdictFromStances(
  supports: number,
  refutes: number,
  total: number,
): Verdict {
  if (total === 0) return "UNVERIFIABLE";
  const supportRatio = supports / total;
  const refuteRatio = refutes / total;
  if (supportRatio >= 0.7) return "SUPPORTED";
  if (refuteRatio >= 0.5) return "REFUTED";
  if (supportRatio >= 0.4) return "UNVERIFIABLE";
  return "UNVERIFIABLE";
}

/** Signal derived from statutory evidence. */
export function makeStatuteSignal(evidence: LegalEvidenceResult): VerdictSignal {
  const items = evidence.statuteEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.9, 0.45 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Statute analysis: ${supports} supporting, ${refutes} refuting across ${items.length} statutes.`
      : "No statutory evidence found for this claim.",
    sources,
    weight: 0.45,
  });
}

/** Signal derived from case law evidence. */
export function makeCaseLawSignal(evidence: LegalEvidenceResult): VerdictSignal {
  const items = evidence.caseLawEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const bindingCount = items.filter(
    (e) => e.metadata.precedentialStatus === "binding",
  ).length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const baseConfidence = items.length > 0 ? Math.min(0.85, 0.35 + items.length * 0.12) : 0.1;
  const confidence = Math.min(0.95, baseConfidence + bindingCount * 0.05);
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Case law analysis: ${supports} supporting, ${refutes} refuting across ${items.length} cases (${bindingCount} binding).`
      : "No case law evidence found for this claim.",
    sources,
    weight: 0.4,
  });
}

/** Signal derived from jurisdiction context evidence. */
export function makeJurisdictionSignal(evidence: LegalEvidenceResult): VerdictSignal {
  const items = evidence.jurisdictionEvidence;
  const verdict: Verdict = items.length > 0 ? "UNVERIFIABLE" : "UNVERIFIABLE";
  const confidence = items.length > 0 ? 0.55 : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Jurisdiction context: ${items.length} jurisdiction profile(s) found for "${evidence.jurisdiction ?? "unspecified"}".`
      : "No jurisdiction evidence found for this claim.",
    sources,
    weight: 0.15,
  });
}

/** Produce all legal verdict signals from a complete evidence result. */
export function makeLegalSignals(
  evidence: LegalEvidenceResult,
): ReadonlyArray<VerdictSignal> {
  return Object.freeze([
    makeStatuteSignal(evidence),
    makeCaseLawSignal(evidence),
    makeJurisdictionSignal(evidence),
  ]);
}
