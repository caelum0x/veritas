// VerifierSelector: choose the best-fit specialized verifiers for a given claim.

import type { SpecializedVerifier, VerifiableClaim } from "./specialized-verifier.js";
import type { VerifierRegistry } from "./registry.js";

/** Options controlling how verifiers are selected for a claim. */
export interface SelectorOptions {
  /** Maximum number of verifiers to return (default: unlimited). */
  readonly maxVerifiers?: number;
  /** Only return verifiers registered under these domain ids. */
  readonly restrictToDomains?: ReadonlyArray<string>;
}

/**
 * Select all registered verifiers that declare they can handle the claim.
 * When restrictToDomains is provided only verifiers covering those domains
 * are considered.  The result preserves registry insertion order.
 */
export function selectVerifiers(
  claim: VerifiableClaim,
  registry: VerifierRegistry,
  options: SelectorOptions = {},
): ReadonlyArray<SpecializedVerifier> {
  const { maxVerifiers, restrictToDomains } = options;

  let candidates: ReadonlyArray<SpecializedVerifier> = registry.list();

  if (restrictToDomains != null && restrictToDomains.length > 0) {
    const allowed = new Set(restrictToDomains);
    candidates = candidates.filter((v) => v.domains.some((d) => allowed.has(d)));
  }

  const eligible = candidates.filter((v) => v.canHandle(claim));

  if (maxVerifiers != null && maxVerifiers > 0) {
    return eligible.slice(0, maxVerifiers);
  }

  return eligible;
}

/**
 * Convenience wrapper: select verifiers for a claim given only a domain hint,
 * bypassing the canHandle check (useful when domain routing is the sole criterion).
 */
export function selectByDomain(
  domain: string,
  registry: VerifierRegistry,
  maxVerifiers?: number,
): ReadonlyArray<SpecializedVerifier> {
  const candidates = registry.listByDomain(domain);
  if (maxVerifiers != null && maxVerifiers > 0) {
    return candidates.slice(0, maxVerifiers);
  }
  return candidates;
}
