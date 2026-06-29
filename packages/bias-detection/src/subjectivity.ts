// Subjectivity scoring: distinguishes objective factual statements from subjective opinion

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export interface SubjectivityScore {
  /** 0 = fully objective, 1 = fully subjective */
  readonly score: number;
  /** Ratio of subjective sentences to total sentences */
  readonly subjectiveSentenceRatio: number;
  /** Words that indicate subjectivity */
  readonly subjectiveMarkers: ReadonlyArray<string>;
  /** Words that indicate objectivity */
  readonly objectiveMarkers: ReadonlyArray<string>;
  /** Whether the text is predominantly opinion-based */
  readonly isOpinionated: boolean;
}

export interface SubjectivityPort {
  score(text: string): Promise<Result<SubjectivityScore>>;
}

// Opinion/subjectivity indicators
const SUBJECTIVE_MARKERS = new Set([
  "think", "believe", "feel", "seem", "appear", "suggest", "argue",
  "claim", "assert", "contend", "maintain", "insist", "suspect",
  "probably", "perhaps", "maybe", "likely", "possibly", "arguably",
  "should", "must", "ought", "need", "clearly", "obviously", "certainly",
  "definitely", "surely", "undoubtedly", "frankly", "honestly", "personally",
  "in my opinion", "i believe", "it seems", "it appears", "one might",
  "best", "worst", "better", "worse", "great", "terrible", "amazing",
  "wonderful", "dreadful", "fantastic", "awful", "beautiful", "ugly",
  "important", "significant", "crucial", "vital", "essential", "unnecessary",
]);

// Objectivity indicators: citations, numbers, passive voice, attribution
const OBJECTIVE_MARKERS = new Set([
  "according to", "reported", "stated", "confirmed", "showed", "found",
  "demonstrated", "indicated", "revealed", "published", "data", "study",
  "research", "survey", "analysis", "evidence", "statistics", "percent",
  "measured", "calculated", "observed", "documented", "verified", "recorded",
]);

function splitSentences(text: string): ReadonlyArray<string> {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function scoreWords(text: string, markerSet: Set<string>): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const marker of markerSet) {
    if (lower.includes(marker)) {
      found.push(marker);
    }
  }
  return found;
}

function isSentenceSubjective(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  for (const marker of SUBJECTIVE_MARKERS) {
    if (lower.includes(marker)) return true;
  }
  // Check for first-person pronouns
  if (/\b(i|we|our|my|us)\b/.test(lower)) return true;
  return false;
}

export class RuleBasedSubjectivityPort implements SubjectivityPort {
  async score(text: string): Promise<Result<SubjectivityScore>> {
    if (!text.trim()) {
      return err(new Error("Empty text provided for subjectivity scoring"));
    }

    const sentences = splitSentences(text);
    if (sentences.length === 0) {
      return ok({
        score: 0,
        subjectiveSentenceRatio: 0,
        subjectiveMarkers: [],
        objectiveMarkers: [],
        isOpinionated: false,
      });
    }

    const subjectiveSentences = sentences.filter(s => isSentenceSubjective(s));
    const subjectiveSentenceRatio = subjectiveSentences.length / sentences.length;

    const foundSubjective = scoreWords(text, SUBJECTIVE_MARKERS);
    const foundObjective = scoreWords(text, OBJECTIVE_MARKERS);

    const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
    const wordCount = Math.max(1, words.length);

    // Subjectivity score: weighted combination of sentence ratio and marker density
    const markerRatio = foundSubjective.length / (foundSubjective.length + foundObjective.length + 1);
    const score = Math.min(1, (subjectiveSentenceRatio * 0.6) + (markerRatio * 0.4));

    const isOpinionated = score > 0.5 || subjectiveSentenceRatio > 0.6;

    return ok({
      score: Math.max(0, Math.min(1, score)),
      subjectiveSentenceRatio,
      subjectiveMarkers: [...new Set(foundSubjective)],
      objectiveMarkers: [...new Set(foundObjective)],
      isOpinionated,
    });
  }
}

export function createSubjectivityPort(): SubjectivityPort {
  return new RuleBasedSubjectivityPort();
}
