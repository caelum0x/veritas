// Weight domain signals: assign relative importance to each verifier's output by domain.
import type { VerdictSignal } from "@veritas/verifier-kit";
import type { ClaimDomain } from "@veritas/verifier-kit";

/** Per-domain base weights applied to verifier signals during aggregation. */
const DOMAIN_WEIGHTS: Readonly<Record<string, number>> = {
  financial: 1.2,
  scientific: 1.1,
  medical: 1.15,
  legal: 1.1,
  news: 0.9,
  crypto: 0.95,
  general: 0.8,
};

/** Default weight when domain is not recognised. */
const DEFAULT_WEIGHT = 1.0;

/** Return the base weight multiplier for a given domain string. */
export function domainWeight(domain: string): number {
  return DOMAIN_WEIGHTS[domain] ?? DEFAULT_WEIGHT;
}

/** Apply domain-based weight scaling to a set of verdict signals (immutable). */
export function applyDomainWeights(
  signals: ReadonlyArray<VerdictSignal>,
  domain: string,
): ReadonlyArray<VerdictSignal> {
  const multiplier = domainWeight(domain);
  return signals.map((s) => ({
    ...s,
    weight: Math.min(1, s.weight * multiplier),
  }));
}

/** Normalise an array of signals so their weights sum to ≤ 1.0. */
export function normaliseWeights(
  signals: ReadonlyArray<VerdictSignal>,
): ReadonlyArray<VerdictSignal> {
  const total = signals.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return signals;
  return signals.map((s) => ({ ...s, weight: s.weight / total }));
}
