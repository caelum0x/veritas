// Converts raw analysis signals (lexicon matches, sentiment, framing) into structured BiasFlags.
import type { LexiconMatch } from "./lexicon.js";
import type { SentimentScore } from "./sentiment.js";
import type { FrameSignal } from "./framing.js";

export interface BiasFlag {
  readonly type: "loaded-language" | "sentiment" | "framing" | "subjectivity" | "political" | "source-quality" | "llm-detected";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly description: string;
  readonly confidence: number;
  readonly span?: {
    readonly start: number;
    readonly end: number;
    readonly text: string;
  };
}

function weightToSeverity(weight: number): BiasFlag["severity"] {
  if (weight >= 0.9) return "critical";
  if (weight >= 0.7) return "high";
  if (weight >= 0.4) return "medium";
  return "low";
}

/** Convert lexicon matches into loaded-language and political bias flags. */
export function flagsFromLexiconMatches(matches: ReadonlyArray<LexiconMatch>): ReadonlyArray<BiasFlag> {
  return matches.map((m): BiasFlag => ({
    type: m.entry.category === "political" ? "political" : "loaded-language",
    severity: weightToSeverity(m.entry.weight),
    description: `Loaded term detected: "${m.matchedText}" (${m.entry.category}, ${m.entry.direction} lean)`,
    confidence: m.entry.weight,
    span: { start: m.startIndex, end: m.endIndex, text: m.matchedText },
  }));
}

/** Convert a sentiment score into a sentiment bias flag, if warranted. */
export function flagFromSentiment(score: SentimentScore): BiasFlag | null {
  if (!score.isEmotional && Math.abs(score.polarity) < 0.4) return null;
  const severity: BiasFlag["severity"] =
    score.intensity >= 0.8 ? "high" :
    score.intensity >= 0.5 ? "medium" : "low";
  return {
    type: "sentiment",
    severity,
    description: `Strong sentiment detected: polarity=${score.polarity.toFixed(2)}, intensity=${score.intensity.toFixed(2)}`,
    confidence: score.confidence,
  };
}

/** Convert framing signals into framing bias flags. */
export function flagsFromFramingSignals(signals: ReadonlyArray<FrameSignal>): ReadonlyArray<BiasFlag> {
  return signals.map((s): BiasFlag => ({
    type: "framing",
    severity: s.confidence >= 0.7 ? "high" : s.confidence >= 0.4 ? "medium" : "low",
    description: `Framing detected: "${s.frameType}" — trigger terms: ${s.triggerTerms.join(", ")}`,
    confidence: s.confidence,
  }));
}

/** Create a subjectivity flag when the subjectivity score exceeds a threshold. */
export function flagFromSubjectivity(subjectivityScore: number): BiasFlag | null {
  if (subjectivityScore < 0.5) return null;
  return {
    type: "subjectivity",
    severity: subjectivityScore >= 0.8 ? "high" : subjectivityScore >= 0.65 ? "medium" : "low",
    description: `High subjectivity score: ${(subjectivityScore * 100).toFixed(1)}%`,
    confidence: 0.75,
  };
}

/** Merge all flags from different sources, deduplicating by type+span. */
export function mergeFlags(
  ...flagSets: ReadonlyArray<ReadonlyArray<BiasFlag>>
): ReadonlyArray<BiasFlag> {
  const all = flagSets.flat();
  // Sort by severity (critical first) then confidence descending
  const order: Record<BiasFlag["severity"], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...all].sort(
    (a, b) => order[a.severity] - order[b.severity] || b.confidence - a.confidence,
  );
}
