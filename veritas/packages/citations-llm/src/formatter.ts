// Format LlmCitation records into human-readable reference strings.

import { type Result, ok, err } from "@veritas/core";
import { type LlmCitation } from "./types.js";
import { type CitationStyleId, resolveStyle } from "./style.js";
import { CitationFormattingError } from "./errors.js";

export interface FormatOptions {
  readonly style: CitationStyleId;
  /** When true, wrap formatted string in Markdown link syntax. */
  readonly markdownLinks?: boolean;
}

/** Format a single LlmCitation into a reference string. */
export function formatCitation(
  citation: LlmCitation,
  options: FormatOptions,
): Result<string, CitationFormattingError> {
  const style = resolveStyle(options.style);

  try {
    let formatted: string;

    switch (style.id) {
      case "apa":
        formatted = formatApa(citation);
        break;
      case "mla":
        formatted = formatMla(citation);
        break;
      case "chicago":
        formatted = formatChicago(citation);
        break;
      case "numeric":
        formatted = citation.span.url;
        break;
      case "inline":
      default:
        formatted = citation.span.url;
        break;
    }

    if (options.markdownLinks) {
      const title = citation.quote
        ? truncate(citation.quote, 60)
        : citation.span.url;
      formatted = `[${title}](${citation.span.url})`;
    }

    return ok(formatted);
  } catch (cause) {
    return err(
      new CitationFormattingError(
        `Failed to format citation ${citation.id}: ${String(cause)}`,
        cause,
      ),
    );
  }
}

/** Format a list of citations, numbering them for a reference list. */
export function formatReferenceList(
  citations: readonly LlmCitation[],
  style: CitationStyleId,
): string[] {
  return citations.map((c, i) => {
    const res = formatCitation(c, { style });
    const text = res.ok ? res.value : c.span.url;
    return style === "numeric" ? `[${i + 1}] ${text}` : text;
  });
}

// ── private helpers ───────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function yearOf(citation: LlmCitation): string {
  // LlmCitation.createdAt is ISO-8601; use it as the best available date.
  return new Date(citation.createdAt).getFullYear().toString();
}

function formatApa(citation: LlmCitation): string {
  // Minimal APA: Author (Year). Title. URL
  const year = yearOf(citation);
  const url = citation.span.url;
  const host = new URL(url).hostname;
  return `${host} (${year}). Retrieved from ${url}`;
}

function formatMla(citation: LlmCitation): string {
  // Minimal MLA: "Title." Site, date, URL.
  const date = new Date(citation.createdAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const url = citation.span.url;
  const host = new URL(url).hostname;
  return `"${host}." Web, ${date}. <${url}>.`;
}

function formatChicago(citation: LlmCitation): string {
  // Minimal Chicago: Author. "Title." URL (Accessed date).
  const date = new Date(citation.createdAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const url = citation.span.url;
  const host = new URL(url).hostname;
  return `${host}. "${host}." ${url} (accessed ${date}).`;
}
