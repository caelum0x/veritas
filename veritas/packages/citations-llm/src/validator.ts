// Validate that LLM-extracted citations refer to known, reachable sources.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { LlmCitation, SourceRef, ValidationResult } from "./types.js";
import { CitationValidationError } from "./errors.js";

/** Validate citations against a set of known source references. */
export function validateCitations(
  citations: readonly LlmCitation[],
  knownSources: readonly SourceRef[],
): Result<ValidationResult, CitationValidationError> {
  try {
    const sourceIndex = indexSources(knownSources);
    const valid: LlmCitation[] = [];
    const invalid: Array<{ citation: LlmCitation; reason: string }> = [];

    for (const citation of citations) {
      const reason = validateOne(citation, sourceIndex);
      if (reason === null) {
        valid.push(citation);
      } else {
        invalid.push({ citation, reason });
      }
    }

    return ok({ valid, invalid });
  } catch (cause) {
    return err(new CitationValidationError("Validation failed unexpectedly", cause));
  }
}

/** Return null if citation is valid, otherwise return a human-readable reason. */
function validateOne(
  citation: LlmCitation,
  sourceIndex: Map<string, SourceRef>,
): string | null {
  if (!citation.span.sourceId) {
    return "Missing sourceId on span";
  }
  if (!citation.span.url) {
    return "Missing url on span";
  }
  if (!citation.quote || citation.quote.trim().length === 0) {
    return "Empty quote";
  }
  if (citation.confidence < 0 || citation.confidence > 1) {
    return `Confidence out of range: ${citation.confidence}`;
  }
  if (citation.span.startOffset >= citation.span.endOffset) {
    return `Invalid offsets: startOffset ${citation.span.startOffset} >= endOffset ${citation.span.endOffset}`;
  }
  if (!sourceIndex.has(citation.span.sourceId)) {
    return `Unknown source: ${citation.span.sourceId}`;
  }
  return null;
}

/** Build a lookup map from sourceId to SourceRef. */
function indexSources(sources: readonly SourceRef[]): Map<string, SourceRef> {
  const map = new Map<string, SourceRef>();
  for (const source of sources) {
    map.set(source.id, source);
  }
  return map;
}

/** Filter citations by minimum confidence, returning only those that pass. */
export function filterByConfidence(
  citations: readonly LlmCitation[],
  minConfidence: number,
): LlmCitation[] {
  return citations.filter((c) => c.confidence >= minConfidence);
}
