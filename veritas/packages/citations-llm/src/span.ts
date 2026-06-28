// Citation span: a character-level or token-level excerpt from a source document.

import { z } from "zod";

export const CitationSpanSchema = z.object({
  /** Opaque source document identifier. */
  sourceId: z.string(),
  /** Absolute URL of the source document. */
  url: z.string().url(),
  /** Character offset (inclusive) where the span begins in the raw text. */
  startOffset: z.number().int().nonnegative(),
  /** Character offset (exclusive) where the span ends in the raw text. */
  endOffset: z.number().int().nonnegative(),
  /** Verbatim text captured from the source at these offsets. */
  text: z.string(),
  /** Optional page / section label supplied by the source document. */
  section: z.string().optional(),
});

export type CitationSpan = z.infer<typeof CitationSpanSchema>;

/** Build a CitationSpan, validating that offsets are consistent. */
export function makeSpan(
  sourceId: string,
  url: string,
  text: string,
  startOffset: number,
  section?: string,
): CitationSpan {
  return CitationSpanSchema.parse({
    sourceId,
    url,
    text,
    startOffset,
    endOffset: startOffset + text.length,
    section,
  });
}

/** Return the character length of a span. */
export function spanLength(span: CitationSpan): number {
  return span.endOffset - span.startOffset;
}

/** Return true if two spans from the same source overlap. */
export function spansOverlap(a: CitationSpan, b: CitationSpan): boolean {
  if (a.sourceId !== b.sourceId) return false;
  return a.startOffset < b.endOffset && b.startOffset < a.endOffset;
}

/** Merge two overlapping spans into a single wider span (text is concatenated with a space). */
export function mergeSpans(a: CitationSpan, b: CitationSpan): CitationSpan {
  if (a.sourceId !== b.sourceId || a.url !== b.url) {
    throw new Error("Cannot merge spans from different sources.");
  }
  const startOffset = Math.min(a.startOffset, b.startOffset);
  const endOffset = Math.max(a.endOffset, b.endOffset);
  const text = a.startOffset <= b.startOffset
    ? `${a.text} ${b.text}`.trim()
    : `${b.text} ${a.text}`.trim();
  return { sourceId: a.sourceId, url: a.url, startOffset, endOffset, text, section: a.section ?? b.section };
}
