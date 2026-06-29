// Crypto verdict signals: derive weighted verdict signals from crypto evidence.

import { type Verdict } from "@veritas/core";
import { makeVerdictSignal, type VerdictSignal } from "@veritas/verifier-kit";
import type { CryptoEvidenceResult } from "./evidence.js";

const VERIFIER_ID = "veritas-crypto";

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

/** Signal derived from on-chain transaction lookups. */
export function makeTxSignal(evidence: CryptoEvidenceResult): VerdictSignal {
  const items = evidence.txEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const successCount = items.filter(
    (e) => e.metadata.status === "success",
  ).length;
  const confidence = items.length > 0
    ? Math.min(0.95, 0.5 + (successCount / items.length) * 0.45)
    : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale:
      items.length > 0
        ? `On-chain tx analysis: ${supports} supporting, ${refutes} refuting across ${items.length} transactions (${successCount} successful).`
        : "No on-chain transaction evidence found for this claim.",
    sources,
    weight: 0.4,
  });
}

/** Signal derived from smart contract verification data. */
export function makeContractSignal(evidence: CryptoEvidenceResult): VerdictSignal {
  const items = evidence.contractEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const verifiedCount = items.filter((e) => e.metadata.isVerified).length;
  const confidence = items.length > 0
    ? Math.min(0.9, 0.4 + (verifiedCount / items.length) * 0.5)
    : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale:
      items.length > 0
        ? `Contract verification analysis: ${supports} supporting, ${refutes} refuting across ${items.length} contracts (${verifiedCount} source-verified).`
        : "No smart contract evidence found for this claim.",
    sources,
    weight: 0.3,
  });
}

/** Signal derived from token market and supply data. */
export function makeTokenSignal(evidence: CryptoEvidenceResult): VerdictSignal {
  const items = evidence.tokenEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0
    ? Math.min(0.8, 0.35 + items.length * 0.15)
    : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale:
      items.length > 0
        ? `Token data analysis: ${supports} supporting, ${refutes} refuting across ${items.length} token records.`
        : "No token market data found for this claim.",
    sources,
    weight: 0.15,
  });
}

/** Signal derived from real-time price feed data. */
export function makePriceSignal(evidence: CryptoEvidenceResult): VerdictSignal {
  const items = evidence.priceEvidence;
  const supports = items.filter((e) => e.stance === "supports").length;
  const refutes = items.filter((e) => e.stance === "refutes").length;
  const verdict = deriveVerdictFromStances(supports, refutes, items.length);
  const confidence = items.length > 0
    ? Math.min(0.85, 0.4 + items.length * 0.2)
    : 0.1;
  const sources = items.map((e) => e.sourceUri).filter((u) => u.length > 0);

  return makeVerdictSignal({
    verifierId: VERIFIER_ID,
    verdict,
    confidence,
    rationale:
      items.length > 0
        ? `Price feed analysis: ${supports} supporting, ${refutes} refuting across ${items.length} price data points.`
        : "No price feed evidence found for this claim.",
    sources,
    weight: 0.15,
  });
}

/** Produce all crypto verdict signals from a complete evidence result. */
export function makeCryptoSignals(
  evidence: CryptoEvidenceResult,
): ReadonlyArray<VerdictSignal> {
  return Object.freeze([
    makeTxSignal(evidence),
    makeContractSignal(evidence),
    makeTokenSignal(evidence),
    makePriceSignal(evidence),
  ]);
}
