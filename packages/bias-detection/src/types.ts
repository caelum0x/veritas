// Shared types for the bias-detection module.
import { z } from "zod";

export const BiasTypeSchema = z.enum([
  "loaded-language",
  "framing",
  "sentiment",
  "subjectivity",
  "political",
  "source-quality",
  "llm-detected",
]);
export type BiasType = z.infer<typeof BiasTypeSchema>;

export const BiasSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type BiasSeverity = z.infer<typeof BiasSeveritySchema>;

export interface BiasSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface BiasFlag {
  readonly type: BiasType;
  readonly severity: BiasSeverity;
  readonly description: string;
  readonly span?: BiasSpan;
  readonly confidence: number; // 0-1
}

export interface SentimentResult {
  readonly score: number; // -1 (negative) to +1 (positive)
  readonly magnitude: number; // 0-1 intensity
  readonly label: "positive" | "negative" | "neutral";
}

export interface FramingSignal {
  readonly frame: string;
  readonly evidence: string;
  readonly confidence: number;
}

export interface SourceBiasProfile {
  readonly sourceId: string;
  readonly politicalLeaning: "far-left" | "left" | "center" | "right" | "far-right" | "unknown";
  readonly credibilityScore: number; // 0-1
  readonly factualReporting: "very-high" | "high" | "mixed" | "low" | "very-low" | "unknown";
  readonly knownBiases: ReadonlyArray<string>;
}

export interface LLMBiasAnalysis {
  readonly detectedBiases: ReadonlyArray<BiasFlag>;
  readonly overallAssessment: string;
  readonly neutralRewrite?: string;
  readonly modelId: string;
  readonly tokensUsed: number;
}

export interface BiasScore {
  readonly overall: number; // 0-1, higher = more biased
  readonly byType: Readonly<Partial<Record<BiasType, number>>>;
  readonly confidence: number;
}

export interface BiasReport {
  readonly id: string;
  readonly claimText: string;
  readonly flags: ReadonlyArray<BiasFlag>;
  readonly score: BiasScore;
  readonly sentiment: SentimentResult;
  readonly framingSignals: ReadonlyArray<FramingSignal>;
  readonly subjectivityScore: number; // 0-1
  readonly sourceBias?: SourceBiasProfile;
  readonly llmAnalysis?: LLMBiasAnalysis;
  readonly mitigationSuggestions: ReadonlyArray<string>;
  readonly analyzedAt: string; // ISO timestamp
}

export interface BiasDetectionContext {
  readonly sourceId?: string;
  readonly sourceUrl?: string;
  readonly enableLLMAnalysis?: boolean;
  readonly enableSourceBias?: boolean;
}
