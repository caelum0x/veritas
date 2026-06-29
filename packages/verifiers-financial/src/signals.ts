// Financial verdict signals: derive weighted verdict signals from financial evidence.

import { type Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { FinancialEvidenceResult } from "./evidence.js";

const VERIFIER_ID = "veritas-financial";

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
  return "UNVERIFIABLE";
}

/** Signal from SEC filing data. */
export function makeFilingSignal(evidence: FinancialEvidenceResult): VerdictSignal {
  const items = evidence.filingEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.9, 0.4 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u): u is string => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `SEC filing analysis: ${supports} supporting, ${refutes} refuting across ${items.length} filings.`
      : "No SEC filing evidence found for this claim.",
    sources,
    weight: 0.45,
  });
}

/** Signal from market/price data. */
export function makeMarketSignal(evidence: FinancialEvidenceResult): VerdictSignal {
  const items = evidence.marketEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.85, 0.35 + items.length * 0.15) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u): u is string => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Market data analysis: ${supports} supporting, ${refutes} refuting across ${items.length} data points.`
      : "No market data evidence found for this claim.",
    sources,
    weight: 0.3,
  });
}

/** Signal from fundamental financial metrics. */
export function makeFundamentalsSignal(evidence: FinancialEvidenceResult): VerdictSignal {
  const items = evidence.fundamentalsEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0 ? Math.min(0.8, 0.3 + items.length * 0.1) : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u): u is string => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale: items.length > 0
      ? `Fundamentals analysis: ${supports} supporting, ${refutes} refuting across ${items.length} periods.`
      : "No fundamentals evidence found for this claim.",
    sources,
    weight: 0.25,
  });
}

/** Produce all financial verdict signals from a complete evidence result. */
export function makeFinancialSignals(
  evidence: FinancialEvidenceResult,
): ReadonlyArray<VerdictSignal> {
  return Object.freeze([
    makeFilingSignal(evidence),
    makeMarketSignal(evidence),
    makeFundamentalsSignal(evidence),
  ]);
}
