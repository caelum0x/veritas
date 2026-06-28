// Sensitivity classifier: assigns a sensitivity level to text based on detected PII.

import { detect } from "./detector.js";
import type { PiiPattern } from "./patterns.js";

export type SensitivityLevel = "none" | "low" | "medium" | "high" | "critical";

export interface ClassificationResult {
  readonly level: SensitivityLevel;
  readonly score: number; // 0-100
  readonly categories: readonly PiiPattern["category"][];
  readonly matchCount: number;
}

/** Weight per category — higher = more sensitive. */
const CATEGORY_WEIGHTS: Record<PiiPattern["category"], number> = {
  ssn: 40,
  card: 35,
  passport: 30,
  iban: 25,
  email: 10,
  phone: 10,
  ip: 5,
};

function levelFromScore(score: number): SensitivityLevel {
  if (score === 0) return "none";
  if (score < 15) return "low";
  if (score < 35) return "medium";
  if (score < 60) return "high";
  return "critical";
}

/** Classify the sensitivity of arbitrary text. */
export function classify(text: string): ClassificationResult {
  const { matches } = detect(text);

  if (matches.length === 0) {
    return Object.freeze({
      level: "none",
      score: 0,
      categories: Object.freeze([]),
      matchCount: 0,
    });
  }

  const categorySet = new Set<PiiPattern["category"]>();
  let rawScore = 0;

  for (const match of matches) {
    categorySet.add(match.category);
    rawScore += CATEGORY_WEIGHTS[match.category] ?? 5;
  }

  // Cap at 100.
  const score = Math.min(100, rawScore);
  const level = levelFromScore(score);

  return Object.freeze({
    level,
    score,
    categories: Object.freeze([...categorySet]),
    matchCount: matches.length,
  });
}

/** Return true if the text exceeds the given sensitivity threshold. */
export function exceedsThreshold(text: string, threshold: SensitivityLevel): boolean {
  const ORDER: SensitivityLevel[] = ["none", "low", "medium", "high", "critical"];
  const result = classify(text);
  return ORDER.indexOf(result.level) >= ORDER.indexOf(threshold);
}
