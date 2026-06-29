// Sentiment analysis port interface and rule-based mock implementation

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export interface SentimentScore {
  /** Overall polarity: -1 (very negative) to +1 (very positive) */
  readonly polarity: number;
  /** Confidence in the polarity score: 0-1 */
  readonly confidence: number;
  /** Intensity of sentiment regardless of direction: 0-1 */
  readonly intensity: number;
  /** Whether the text expresses strong emotion */
  readonly isEmotional: boolean;
}

export interface SentimentPort {
  analyze(text: string): Promise<Result<SentimentScore>>;
}

// Positive and negative word lists for rule-based sentiment
const POSITIVE_WORDS = new Set([
  "good", "great", "excellent", "wonderful", "outstanding", "positive",
  "success", "achieve", "benefit", "improve", "progress", "gain",
  "effective", "efficient", "strong", "support", "celebrate", "approve",
  "advance", "victory", "win", "triumph", "promising", "favorable",
  "thriving", "flourishing", "innovative", "breakthrough", "exemplary",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "horrible", "negative", "failure", "fail",
  "harm", "damage", "destroy", "lose", "loss", "ineffective", "weak",
  "oppose", "condemn", "crisis", "disaster", "catastrophe", "devastating",
  "alarming", "dangerous", "corrupt", "scandalous", "outrageous", "disgraceful",
  "decline", "collapse", "threat", "problem", "issue", "concern", "risk",
]);

const INTENSIFIERS = new Set([
  "very", "extremely", "highly", "deeply", "severely", "incredibly",
  "utterly", "absolutely", "completely", "totally", "profoundly",
]);

/** Rule-based sentiment analyzer — no external dependencies required */
export class RuleBasedSentimentPort implements SentimentPort {
  async analyze(text: string): Promise<Result<SentimentScore>> {
    if (!text.trim()) {
      return err(new Error("Empty text provided for sentiment analysis"));
    }

    const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
    if (words.length === 0) {
      return ok({ polarity: 0, confidence: 0, intensity: 0, isEmotional: false });
    }

    let positiveCount = 0;
    let negativeCount = 0;
    let intensifierCount = 0;
    let i = 0;

    while (i < words.length) {
      const word = words[i] ?? "";
      const isIntensified = i > 0 && INTENSIFIERS.has(words[i - 1] ?? "");
      const multiplier = isIntensified ? 1.5 : 1.0;

      if (POSITIVE_WORDS.has(word)) {
        positiveCount += multiplier;
      } else if (NEGATIVE_WORDS.has(word)) {
        negativeCount += multiplier;
      } else if (INTENSIFIERS.has(word)) {
        intensifierCount++;
      }
      i++;
    }

    const totalSentiment = positiveCount + negativeCount;
    const rawPolarity = totalSentiment === 0
      ? 0
      : (positiveCount - negativeCount) / totalSentiment;

    // Normalize to -1..+1 range using total word ratio
    const sentimentDensity = totalSentiment / words.length;
    const polarity = rawPolarity * Math.min(1, sentimentDensity * 5);

    const intensity = Math.min(1, sentimentDensity * 3 + (intensifierCount / words.length) * 2);
    const confidence = Math.min(1, totalSentiment / (words.length * 0.1 + 1));
    const isEmotional = intensity > 0.4 || intensifierCount > 2;

    return ok({
      polarity: Math.max(-1, Math.min(1, polarity)),
      confidence: Math.max(0, Math.min(1, confidence)),
      intensity: Math.max(0, Math.min(1, intensity)),
      isEmotional,
    });
  }
}

/** Create the default sentiment port instance */
export function createSentimentPort(): SentimentPort {
  return new RuleBasedSentimentPort();
}
