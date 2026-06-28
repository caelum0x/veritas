// PII detector: finds sensitive data matches in text using regex patterns and Luhn validation.

import { PII_PATTERNS, type PiiPattern } from "./patterns.js";
import { isValidCardNumber } from "./luhn.js";

export interface DetectionMatch {
  readonly pattern: string;
  readonly category: PiiPattern["category"];
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export interface DetectionResult {
  readonly matches: readonly DetectionMatch[];
  readonly hasMatches: boolean;
}

function runPattern(text: string, pattern: PiiPattern): readonly DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const re = new RegExp(pattern.regex.source, pattern.regex.flags.includes("g") ? pattern.regex.flags : pattern.regex.flags + "g");

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = match[0];

    // Extra validation for credit cards — require Luhn pass.
    if (pattern.category === "card" && !isValidCardNumber(value)) continue;

    matches.push(
      Object.freeze({
        pattern: pattern.name,
        category: pattern.category,
        value,
        start: match.index,
        end: match.index + value.length,
      })
    );
  }

  return matches;
}

/** Detect all PII matches in a plain-text string. */
export function detect(text: string): DetectionResult {
  const all: DetectionMatch[] = [];

  for (const pattern of PII_PATTERNS) {
    const found = runPattern(text, pattern);
    all.push(...found);
  }

  // Sort by position for deterministic output.
  const sorted = [...all].sort((a, b) => a.start - b.start);

  return Object.freeze({ matches: Object.freeze(sorted), hasMatches: sorted.length > 0 });
}

/** Detect matches for specific categories only. */
export function detectCategories(
  text: string,
  categories: readonly PiiPattern["category"][]
): DetectionResult {
  const set = new Set(categories);
  const filtered = PII_PATTERNS.filter((p) => set.has(p.category));
  const all: DetectionMatch[] = [];

  for (const pattern of filtered) {
    const found = runPattern(text, pattern);
    all.push(...found);
  }

  const sorted = [...all].sort((a, b) => a.start - b.start);
  return Object.freeze({ matches: Object.freeze(sorted), hasMatches: sorted.length > 0 });
}
