// Medical verdict signals: derive weighted verdict signals from medical evidence sources.

import { type Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { MedicalEvidenceResult } from "./evidence.js";

const VERIFIER_ID = "veritas-medical";

/** Derive a verdict from the proportion of supporting vs refuting evidence stances. */
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

/** Signal derived from drug database records. */
export function makeDrugDbSignal(evidence: MedicalEvidenceResult): VerdictSignal {
  const items = evidence.drugEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.9, 0.4 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Drug database analysis: ${supports} supporting, ${refutes} refuting across ${items.length} records.`
      : "No drug database evidence found for this claim.",
    sources,
    weight: 0.35,
  });
}

/** Signal derived from clinical practice guidelines. */
export function makeGuidelinesSignal(evidence: MedicalEvidenceResult): VerdictSignal {
  const items = evidence.guidelinesEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.95, 0.5 + items.length * 0.15) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Clinical guidelines analysis: ${supports} supporting, ${refutes} refuting across ${items.length} guidelines.`
      : "No clinical guideline evidence found for this claim.",
    sources,
    weight: 0.35,
  });
}

/** Signal derived from ICD diagnostic code lookup. */
export function makeIcdSignal(evidence: MedicalEvidenceResult): VerdictSignal {
  const items = evidence.icdEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.85, 0.4 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);
  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `ICD code analysis: ${supports} supporting, ${refutes} refuting across ${items.length} codes.`
      : "No ICD diagnostic code evidence found for this claim.",
    sources,
    weight: 0.15,
  });
}

/** Signal derived from evidence-grade classification of studies. */
export function makeEvidenceGradeSignal(evidence: MedicalEvidenceResult): VerdictSignal {
  const items = evidence.gradeEvidence;
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
      ? `Evidence-grade analysis: ${supports} supporting, ${refutes} refuting across ${items.length} studies.`
      : "No graded study evidence found for this claim.",
    sources,
    weight: 0.15,
  });
}

/** Produce all medical verdict signals from a complete evidence result. */
export function makeMedicalSignals(
  evidence: MedicalEvidenceResult,
): ReadonlyArray<VerdictSignal> {
  return Object.freeze([
    makeDrugDbSignal(evidence),
    makeGuidelinesSignal(evidence),
    makeIcdSignal(evidence),
    makeEvidenceGradeSignal(evidence),
  ]);
}
