// Main bias/loaded-language detector: orchestrates lexicon, sentiment, framing, subjectivity

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { buildDefaultLexicon, matchLexicon } from "./lexicon.js";
import type { LexiconMatch } from "./lexicon.js";
import { createSentimentPort } from "./sentiment.js";
import type { SentimentScore, SentimentPort } from "./sentiment.js";
import { createFramingPort } from "./framing.js";
import type { FramingAnalysis, FramingPort } from "./framing.js";
import { createSubjectivityPort } from "./subjectivity.js";
import type { SubjectivityScore, SubjectivityPort } from "./subjectivity.js";

export interface BiasDetectionInput {
  readonly text: string;
  /** Optional source identifier for source-level bias context */
  readonly sourceId?: string;
}

export interface LoadedLanguageResult {
  readonly matches: ReadonlyArray<LexiconMatch>;
  readonly loadedTermCount: number;
  readonly loadedTermDensity: number; // matches per 100 words
}

export interface BiasDetectionResult {
  readonly input: BiasDetectionInput;
  readonly loadedLanguage: LoadedLanguageResult;
  readonly sentiment: SentimentScore;
  readonly framing: FramingAnalysis;
  readonly subjectivity: SubjectivityScore;
  /** Composite bias score 0-1 */
  readonly overallBiasScore: number;
  /** Human-readable summary of detected biases */
  readonly summary: string;
  readonly detectedAt: string;
}

export interface BiasDetectorOptions {
  readonly sentimentPort?: SentimentPort;
  readonly framingPort?: FramingPort;
  readonly subjectivityPort?: SubjectivityPort;
}

function buildSummary(result: Omit<BiasDetectionResult, "summary" | "detectedAt">): string {
  const parts: string[] = [];

  if (result.loadedLanguage.loadedTermCount > 0) {
    parts.push(
      `${result.loadedLanguage.loadedTermCount} loaded term(s) detected ` +
      `(${result.loadedLanguage.loadedTermDensity.toFixed(1)} per 100 words)`
    );
  }

  if (result.sentiment.isEmotional) {
    const direction = result.sentiment.polarity > 0.2
      ? "positive"
      : result.sentiment.polarity < -0.2
      ? "negative"
      : "mixed";
    parts.push(`Emotionally charged language with ${direction} sentiment`);
  }

  if (result.framing.dominantFrame !== "neutral") {
    parts.push(`Primary framing: ${result.framing.dominantFrame.replace("_", " ")}`);
    if (result.framing.hasCompetingFrames) {
      parts.push("Competing frames detected (possible spin)");
    }
  }

  if (result.subjectivity.isOpinionated) {
    parts.push(
      `High subjectivity (${(result.subjectivity.score * 100).toFixed(0)}% — ` +
      `${(result.subjectivity.subjectiveSentenceRatio * 100).toFixed(0)}% subjective sentences)`
    );
  }

  if (parts.length === 0) {
    return "No significant bias signals detected";
  }

  return parts.join(". ") + ".";
}

export class BiasDetector {
  private readonly lexicon = buildDefaultLexicon();
  private readonly sentimentPort: SentimentPort;
  private readonly framingPort: FramingPort;
  private readonly subjectivityPort: SubjectivityPort;

  constructor(opts: BiasDetectorOptions = {}) {
    this.sentimentPort = opts.sentimentPort ?? createSentimentPort();
    this.framingPort = opts.framingPort ?? createFramingPort();
    this.subjectivityPort = opts.subjectivityPort ?? createSubjectivityPort();
  }

  async detect(input: BiasDetectionInput): Promise<Result<BiasDetectionResult>> {
    const { text } = input;
    if (!text.trim()) {
      return err(new Error("Text must not be empty"));
    }

    const wordCount = Math.max(1, (text.match(/\b\w+\b/g) ?? []).length);
    const lexiconMatches = matchLexicon(text, this.lexicon);
    const loadedTermDensity = (lexiconMatches.length / wordCount) * 100;

    const loadedLanguage: LoadedLanguageResult = {
      matches: lexiconMatches,
      loadedTermCount: lexiconMatches.length,
      loadedTermDensity,
    };

    const [sentimentResult, framingResult, subjectivityResult] = await Promise.all([
      this.sentimentPort.analyze(text),
      this.framingPort.analyze(text),
      this.subjectivityPort.score(text),
    ]);

    if (!sentimentResult.ok) return sentimentResult;
    if (!framingResult.ok) return framingResult;
    if (!subjectivityResult.ok) return subjectivityResult;

    const sentiment = sentimentResult.value;
    const framing = framingResult.value;
    const subjectivity = subjectivityResult.value;

    // Composite bias score: weighted combination
    const loadedScore = Math.min(1, loadedTermDensity / 5);
    const emotionScore = sentiment.isEmotional ? sentiment.intensity : 0;
    const framingScore = framing.framingBias;
    const subjectivityComponent = subjectivity.score;

    const overallBiasScore = Math.min(
      1,
      loadedScore * 0.3 +
      emotionScore * 0.25 +
      framingScore * 0.2 +
      subjectivityComponent * 0.25
    );

    const partial = {
      input,
      loadedLanguage,
      sentiment,
      framing,
      subjectivity,
      overallBiasScore,
    };

    const result: BiasDetectionResult = {
      ...partial,
      summary: buildSummary(partial),
      detectedAt: new Date().toISOString(),
    };

    return ok(result);
  }
}

export function createBiasDetector(opts?: BiasDetectorOptions): BiasDetector {
  return new BiasDetector(opts);
}
