// Deduplicate citation URLs within a source list, preserving insertion order.

import type { ReportCitation } from "@veritas/contracts";
import { normalizeUrl } from "@veritas/core";

/** Canonical key for a citation URL used to identify duplicates. */
function citationKey(url: string): string {
  const normalized = normalizeUrl(url);
  if (normalized == null) return url.toLowerCase().trim();
  // Strip trailing slash for consistent comparison.
  return normalized.replace(/\/$/, "");
}

/**
 * Deduplicate an array of citations by their normalized URL.
 * When duplicates are found, the first occurrence is retained and merged with
 * any richer metadata (title, quote) from subsequent duplicates.
 * Returns a new array in original insertion order.
 */
export function dedupeByUrl(citations: ReadonlyArray<ReportCitation>): ReportCitation[] {
  const seen = new Map<string, ReportCitation>();

  for (const citation of citations) {
    const key = citationKey(citation.url);
    const existing = seen.get(key);

    if (existing == null) {
      seen.set(key, citation);
    } else {
      // Merge: prefer non-null title and quote from whichever has them.
      const merged: ReportCitation = {
        url: existing.url,
        title: existing.title ?? citation.title,
        quote: existing.quote ?? citation.quote,
        supports: existing.supports || citation.supports,
      };
      seen.set(key, merged);
    }
  }

  return Array.from(seen.values());
}

/**
 * Return the set of unique hostnames present in the citation list.
 * Useful for counting distinct domains after deduplication.
 */
export function uniqueHosts(citations: ReadonlyArray<ReportCitation>): ReadonlySet<string> {
  const hosts = new Set<string>();
  for (const c of citations) {
    try {
      const url = new URL(c.url);
      const host = url.hostname.replace(/^www\./, "");
      if (host) hosts.add(host);
    } catch {
      // Ignore malformed URLs.
    }
  }
  return hosts;
}
