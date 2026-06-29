// Extract structured citations from raw LLM output text or tool-call payloads.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { CitationSpanSchema, type CitationSpan } from "./span.js";
import { CitationExtractionError } from "./errors.js";

/** A single citation candidate parsed from LLM output. */
export const RawCitationSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  quote: z.string().optional(),
  sourceId: z.string().optional(),
  supports: z.boolean().optional(),
  relevance: z.number().min(0).max(1).optional(),
});

export type RawCitation = z.infer<typeof RawCitationSchema>;

/** Pattern matching Markdown-style inline links: [text](url). */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

/** Pattern matching bare URLs in text. */
const BARE_URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/g;

/** Extract citations from a markdown or plain-text LLM response. */
export function extractFromText(text: string): RawCitation[] {
  const seen = new Set<string>();
  const results: RawCitation[] = [];

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const title = match[1];
    const url = match[2];
    if (url !== undefined && !seen.has(url)) {
      seen.add(url);
      results.push({ url, title: title !== undefined ? title.trim() : undefined });
    }
  }

  for (const match of text.matchAll(BARE_URL_RE)) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      results.push({ url });
    }
  }

  return results;
}

/** Parse citations from a structured JSON payload (e.g. a tool-call result). */
export function extractFromJson(
  payload: unknown,
): Result<RawCitation[], CitationExtractionError> {
  if (!Array.isArray(payload)) {
    return err(
      new CitationExtractionError("Payload must be an array of citation objects."),
    );
  }

  const citations: RawCitation[] = [];
  for (const item of payload) {
    const parsed = RawCitationSchema.safeParse(item);
    if (!parsed.success) {
      return err(
        new CitationExtractionError(
          `Invalid citation object: ${parsed.error.message}`,
        ),
      );
    }
    citations.push(parsed.data);
  }

  return ok(citations);
}

/** Convert a RawCitation into a CitationSpan when offset information is available. */
export function toCitationSpan(
  raw: RawCitation & { sourceId: string; startOffset: number; endOffset?: number },
): Result<CitationSpan, CitationExtractionError> {
  const text = raw.quote ?? "";
  const endOffset = raw.endOffset ?? raw.startOffset + text.length;

  const result = CitationSpanSchema.safeParse({
    sourceId: raw.sourceId,
    url: raw.url,
    startOffset: raw.startOffset,
    endOffset,
    text,
  });

  if (!result.success) {
    return err(new CitationExtractionError(result.error.message));
  }

  return ok(result.data);
}
