// Deduplicate LLM citations by content hash or span identity.

import { ok, err, sha256Hex } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { LlmCitation, DedupeResult, DedupeOptions } from "./types.js";
import { DuplicateCitationError } from "./errors.js";

/** Compute a deduplication key for a citation from its span content. */
function citationKey(citation: LlmCitation): string {
  if (citation.contentHash) return citation.contentHash;
  const raw = `${citation.span.sourceId}::${citation.span.startOffset}::${citation.span.endOffset}::${citation.span.text}`;
  return sha256Hex(raw);
}

/**
 * Deduplicate citations, keeping exactly one per unique span.
 * When preferHighConfidence is true, the retained citation is the one with highest confidence.
 */
export function deduplicateCitations(
  citations: readonly LlmCitation[],
  options: DedupeOptions = {},
): Result<DedupeResult, DuplicateCitationError> {
  try {
    const { preferHighConfidence = true } = options;

    const seen = new Map<string, LlmCitation>();
    const duplicates: LlmCitation[] = [];

    for (const citation of citations) {
      const key = citationKey(citation);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, citation);
        continue;
      }

      // Decide which to keep.
      if (preferHighConfidence && citation.confidence > existing.confidence) {
        duplicates.push(existing);
        seen.set(key, citation);
      } else {
        duplicates.push(citation);
      }
    }

    return ok({ unique: Array.from(seen.values()), duplicates });
  } catch (cause) {
    return err(new DuplicateCitationError("deduplication-error"));
  }
}

/** Attach a content hash to each citation that lacks one. */
export function annotateCitationHashes(
  citations: readonly LlmCitation[],
): LlmCitation[] {
  return citations.map((c) => {
    if (c.contentHash) return c;
    const raw = `${c.span.sourceId}::${c.span.startOffset}::${c.span.endOffset}::${c.span.text}`;
    return { ...c, contentHash: sha256Hex(raw) };
  });
}
