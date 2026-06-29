// Apply allowedDomains and blockedDomains filters to a citation list.

import type { ReportCitation } from "@veritas/contracts";
import { hostOf } from "@veritas/core";

/** Options controlling domain-based citation filtering. */
export interface DomainFilterOptions {
  /**
   * If provided, only citations whose hostname matches an entry in this list
   * (exact or subdomain match) are retained.
   */
  readonly allowedDomains?: ReadonlyArray<string>;
  /**
   * Citations whose hostname matches any entry in this list are removed.
   * Applied after allowedDomains when both are specified.
   */
  readonly blockedDomains?: ReadonlyArray<string>;
}

/** Normalize a domain entry to lower-case and strip leading "www.". */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

/**
 * Return true if `host` matches `domain` exactly or as a subdomain.
 * E.g. "news.example.com" matches "example.com".
 */
function hostMatchesDomain(host: string, domain: string): boolean {
  const h = normalizeDomain(host);
  const d = normalizeDomain(domain);
  return h === d || h.endsWith(`.${d}`);
}

/** Return true if `host` matches any domain in the list. */
function hostMatchesAny(host: string, domains: ReadonlyArray<string>): boolean {
  return domains.some((d) => hostMatchesDomain(host, d));
}

/**
 * Filter citations according to the provided domain allowlist and blocklist.
 * Citations with unparseable URLs are kept unless a strict allowlist is set,
 * in which case they are excluded (no hostname to verify against).
 * Returns a new array; the input is not mutated.
 */
export function applyDomainFilter(
  citations: ReadonlyArray<ReportCitation>,
  options: DomainFilterOptions,
): ReportCitation[] {
  const { allowedDomains, blockedDomains } = options;

  const hasAllowlist = allowedDomains != null && allowedDomains.length > 0;
  const hasBlocklist = blockedDomains != null && blockedDomains.length > 0;

  if (!hasAllowlist && !hasBlocklist) {
    return [...citations];
  }

  return citations.filter((citation) => {
    const host = hostOf(citation.url);

    // If we cannot resolve a host and an allowlist is active, exclude the citation.
    if (host == null) {
      return !hasAllowlist;
    }

    if (hasAllowlist && !hostMatchesAny(host, allowedDomains!)) {
      return false;
    }

    if (hasBlocklist && hostMatchesAny(host, blockedDomains!)) {
      return false;
    }

    return true;
  });
}
