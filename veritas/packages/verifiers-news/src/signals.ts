// News verdict signals: derive weighted verdict signals from news evidence.

import { type Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { NewsEvidenceResult } from "./evidence.js";

const VERIFIER_ID = "veritas-news";

/** Derive a verdict from the proportion of supporting vs refuting evidence. */
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

/** Signal derived from credible outlet reporting. */
export function makeOutletSignal(evidence: NewsEvidenceResult): VerdictSignal {
  const items = evidence.outletEvidence;
  const tier1 = items.filter((e) => e.metadata.outletTier === "tier1");
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const tierBonus = Math.min(0.2, tier1.length * 0.05);
  const confidence = items.length > 0
    ? Math.min(0.9, 0.35 + items.length * 0.1 + tierBonus)
    : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Outlet analysis: ${supports} supporting, ${refutes} refuting across ${items.length} articles (${tier1.length} tier-1).`
      : "No outlet evidence found for this claim.",
    sources,
    weight: 0.35,
  });
}

/** Signal derived from cross-source corroboration. */
export function makeCrossSourceSignal(evidence: NewsEvidenceResult): VerdictSignal {
  const items = evidence.crossSourceEvidence;
  if (items.length === 0) {
    return makeVerdictSignal({
      verifierId: VERIFIER_ID,
      verdict: "UNVERIFIABLE",
      confidence: 0.1,
      rationale: "No cross-source corroboration data available.",
      sources: [],
      weight: 0.3,
    });
  }
  const best = items.reduce((a, b) =>
    b.metadata.corroborationCount > a.metadata.corroborationCount ? b : a,
  );
  const corrobCount = best.metadata.corroborationCount;
  const contradictCount = best.metadata.contradictionCount;
  const wireConfirmed = best.metadata.wireServiceConfirmed;

  let verdict: Verdict;
  if (corrobCount >= 3 && contradictCount === 0) verdict = "SUPPORTED";
  else if (contradictCount > corrobCount) verdict = "REFUTED";
  else if (corrobCount >= 1) verdict = "UNVERIFIABLE";
  else verdict = "UNVERIFIABLE";

  const wireBonus = wireConfirmed ? 0.15 : 0;
  const confidence = Math.min(0.95, 0.3 + corrobCount * 0.1 + wireBonus);
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: `Cross-source: ${corrobCount} corroborating, ${contradictCount} contradicting outlets. Wire service ${wireConfirmed ? "confirmed" : "not confirmed"}.`,
    sources,
    weight: 0.3,
  });
}

/** Signal derived from recency and temporal freshness of coverage. */
export function makeRecencySignal(evidence: NewsEvidenceResult): VerdictSignal {
  const items = evidence.recencyEvidence;
  if (items.length === 0) {
    return makeVerdictSignal({
      verifierId: VERIFIER_ID,
      verdict: "UNVERIFIABLE",
      confidence: 0.1,
      rationale: "No recency data available for this claim.",
      sources: [],
      weight: 0.15,
    });
  }
  const latest = items[0];
  const ageHours = latest?.metadata.ageHours ?? null;
  const isRecent = ageHours != null && ageHours < 72;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const recencyBonus = isRecent ? 0.1 : 0;
  const confidence = Math.min(0.85, 0.25 + items.length * 0.1 + recencyBonus);
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: ageHours != null
      ? `Recency: claim is ${Math.round(ageHours)}h old. Coverage is ${isRecent ? "recent" : "dated"}.`
      : "Recency: publication date could not be determined.",
    sources,
    weight: 0.15,
  });
}

/** Signal derived from wire service confirmation. */
export function makeWireSignal(evidence: NewsEvidenceResult): VerdictSignal {
  const items = evidence.wireEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.92, 0.5 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Wire services: ${supports} supporting, ${refutes} refuting across ${items.length} dispatches.`
      : "No wire service dispatches found for this claim.",
    sources,
    weight: 0.2,
  });
}

/** Produce all news verdict signals from a complete evidence result. */
export function makeNewsSignals(
  evidence: NewsEvidenceResult,
): ReadonlyArray<VerdictSignal> {
  return Object.freeze([
    makeOutletSignal(evidence),
    makeCrossSourceSignal(evidence),
    makeRecencySignal(evidence),
    makeWireSignal(evidence),
  ]);
}
