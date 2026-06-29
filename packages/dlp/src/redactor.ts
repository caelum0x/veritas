// Redact PII from text by replacing detected matches with configurable placeholders.

import { detect, detectCategories, type DetectionMatch } from "./detector.js";
import type { PiiPattern } from "./patterns.js";

export interface RedactOptions {
  /** Override placeholder per category, e.g. { email: "[EMAIL]" }. */
  readonly placeholders?: Partial<Record<PiiPattern["category"], string>>;
  /** Only redact specific categories. Omit to redact all. */
  readonly categories?: readonly PiiPattern["category"][];
  /** Default placeholder when no category-specific override is set. */
  readonly defaultPlaceholder?: string;
}

const DEFAULT_PLACEHOLDERS: Record<PiiPattern["category"], string> = {
  email: "[EMAIL]",
  ssn: "[SSN]",
  card: "[CARD]",
  phone: "[PHONE]",
  ip: "[IP]",
  passport: "[PASSPORT]",
  iban: "[IBAN]",
};

function placeholderFor(
  category: PiiPattern["category"],
  options: RedactOptions
): string {
  return (
    options.placeholders?.[category] ??
    DEFAULT_PLACEHOLDERS[category] ??
    options.defaultPlaceholder ??
    "[REDACTED]"
  );
}

function applyRedactions(text: string, matches: readonly DetectionMatch[], options: RedactOptions): string {
  if (matches.length === 0) return text;

  // Process matches in reverse order to preserve indices.
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let result = text;

  for (const match of sorted) {
    const placeholder = placeholderFor(match.category, options);
    result = result.slice(0, match.start) + placeholder + result.slice(match.end);
  }

  return result;
}

/** Redact all detected PII from text. Returns the sanitised string. */
export function redact(text: string, options: RedactOptions = {}): string {
  const result = options.categories
    ? detectCategories(text, options.categories)
    : detect(text);

  return applyRedactions(text, result.matches, options);
}

/** Redact and return both the sanitised text and the list of redacted matches. */
export function redactWithReport(
  text: string,
  options: RedactOptions = {}
): { readonly redacted: string; readonly matches: readonly DetectionMatch[] } {
  const result = options.categories
    ? detectCategories(text, options.categories)
    : detect(text);

  return Object.freeze({
    redacted: applyRedactions(text, result.matches, options),
    matches: result.matches,
  });
}
