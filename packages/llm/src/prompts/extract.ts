// Extraction prompt template: builds the user-turn message for claim extraction
import { truncate } from "@veritas/core";

/** Maximum characters of document text to include in extraction prompt */
const MAX_DOC_CHARS = 12_000;

/** Builds the user-turn content for claim extraction */
export function buildExtractionPrompt(
  documentText: string,
  maxClaims: number,
): string {
  const truncated = truncate(documentText, MAX_DOC_CHARS);
  const ellipsis = truncated.length < documentText.length ? "\n[…document truncated…]" : "";

  return [
    `Extract up to ${maxClaims} discrete, independently verifiable factual claims from the document below.`,
    "",
    "Rules:",
    "- Each claim must be a single, self-contained assertion that can be checked against external sources.",
    "- Ignore opinions, predictions, and rhetorical questions.",
    "- Rank claims by check-worthiness: prefer specific, falsifiable statements (names, dates, statistics, causation).",
    "- For each claim include its character offset in the original text when determinable.",
    "",
    "Return JSON that conforms to the extraction schema — an object with a \"claims\" array.",
    "",
    "DOCUMENT:",
    "```",
    truncated + ellipsis,
    "```",
  ].join("\n");
}

/** Builds a concise extraction context description for the system prompt */
export function extractionContext(documentLength: number): string {
  return (
    `You are extracting factual claims from a document of ${documentLength.toLocaleString()} characters. ` +
    "Focus only on verifiable facts."
  );
}
