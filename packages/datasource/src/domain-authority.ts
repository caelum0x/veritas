// Domain authority scoring: compute an authority score [0,1] for a given domain.

import { type Score, clampScore } from "@veritas/core";
import { SourceTier } from "@veritas/core";

/** Static authority weights keyed by TLD or known domain suffix. */
const TLD_WEIGHTS: Readonly<Record<string, number>> = {
  gov: 0.95,
  edu: 0.90,
  int: 0.90,
  "ac.uk": 0.88,
  org: 0.70,
  com: 0.50,
  net: 0.45,
  io: 0.40,
  co: 0.40,
};

/** Well-known high-authority domains with explicit overrides. */
const DOMAIN_OVERRIDES: Readonly<Record<string, number>> = {
  "reuters.com": 0.92,
  "apnews.com": 0.91,
  "bbc.co.uk": 0.90,
  "nature.com": 0.95,
  "science.org": 0.95,
  "who.int": 0.97,
  "cdc.gov": 0.97,
  "nih.gov": 0.97,
};

/** Derive a Score [0,1] representing the authority of the given domain. */
export function domainAuthorityScore(domain: string): Score {
  const lower = domain.toLowerCase().replace(/^www\./, "");

  if (Object.prototype.hasOwnProperty.call(DOMAIN_OVERRIDES, lower)) {
    return clampScore(DOMAIN_OVERRIDES[lower] as number);
  }

  // Try multi-part TLD first (e.g., ac.uk)
  const parts = lower.split(".");
  if (parts.length >= 3) {
    const multiTld = parts.slice(-2).join(".");
    if (Object.prototype.hasOwnProperty.call(TLD_WEIGHTS, multiTld)) {
      return clampScore(TLD_WEIGHTS[multiTld] as number);
    }
  }

  const tld = parts[parts.length - 1] ?? "";
  if (Object.prototype.hasOwnProperty.call(TLD_WEIGHTS, tld)) {
    return clampScore(TLD_WEIGHTS[tld] as number);
  }

  return clampScore(0.35);
}

/** Map a SourceTier to a numeric authority baseline. */
export function tierToAuthorityBaseline(tier: typeof SourceTier[keyof typeof SourceTier]): Score {
  const map: Readonly<Record<string, number>> = {
    [SourceTier.PRIMARY]: 0.90,
    [SourceTier.SECONDARY]: 0.65,
    [SourceTier.TERTIARY]: 0.40,
    [SourceTier.UNKNOWN]: 0.20,
  };
  return clampScore(map[tier] ?? 0.20);
}
