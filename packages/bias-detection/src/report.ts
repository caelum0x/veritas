// Assembles individual bias analysis signals into a unified BiasReport.
import { newId } from "@veritas/core";
import type { BiasFlag } from "./flags.js";
import type { BiasScore } from "./scoring.js";
import type { SourceBiasProfile } from "./source-bias.js";
import type { LLMBiasResult } from "./llm-bias.js";
import type { SentimentScore } from "./sentiment.js";
import type { FramingAnalysis } from "./framing.js";
import type { SubjectivityScore } from "./subjectivity.js";

export interface BiasReport {
  readonly id: string;
  /** Original text that was analyzed. */
  readonly claimText: string;
  /** All bias flags raised across all detection methods. */
  readonly flags: ReadonlyArray<BiasFlag>;
  /** Composite bias score. */
  readonly score: BiasScore;
  /** Raw sentiment analysis result. */
  readonly sentiment: SentimentScore;
  /** Framing analysis summary. */
  readonly framing: FramingAnalysis;
  /** Raw subjectivity analysis. */
  readonly subjectivity: SubjectivityScore;
  /** Source bias profile if a source was resolved. */
  readonly sourceBias: SourceBiasProfile | null;
  /** LLM-backed analysis if enabled. */
  readonly llmAnalysis: LLMBiasResult | null;
  /** Human-readable tier label derived from overall score. */
  readonly biasTier: "minimal" | "low" | "moderate" | "high" | "extreme";
  /** ISO timestamp of when this report was produced. */
  readonly analyzedAt: string;
}

export interface BiasReportInput {
  readonly claimText: string;
  readonly flags: ReadonlyArray<BiasFlag>;
  readonly score: BiasScore;
  readonly sentiment: SentimentScore;
  readonly framing: FramingAnalysis;
  readonly subjectivity: SubjectivityScore;
  readonly sourceBias: SourceBiasProfile | null;
  readonly llmAnalysis: LLMBiasResult | null;
  readonly biasTier: BiasReport["biasTier"];
}

/** Construct an immutable BiasReport from assembled analysis inputs. */
export function buildBiasReport(input: BiasReportInput): BiasReport {
  return {
    id: newId("bias"),
    claimText: input.claimText,
    flags: input.flags,
    score: input.score,
    sentiment: input.sentiment,
    framing: input.framing,
    subjectivity: input.subjectivity,
    sourceBias: input.sourceBias,
    llmAnalysis: input.llmAnalysis,
    biasTier: input.biasTier,
    analyzedAt: new Date().toISOString(),
  };
}

/** Return the top N flags ordered by severity then confidence. */
export function topFlags(report: BiasReport, n = 5): ReadonlyArray<BiasFlag> {
  const severityOrder: Record<BiasFlag["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...report.flags]
    .sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        b.confidence - a.confidence,
    )
    .slice(0, n);
}

/** Produce a plain-text summary of the bias report for logging or display. */
export function summarizeBiasReport(report: BiasReport): string {
  const flagCount = report.flags.length;
  const scorePercent = (report.score.overall * 100).toFixed(1);
  const top = topFlags(report, 3)
    .map((f) => `[${f.severity}] ${f.description}`)
    .join("; ");
  return (
    `BiasReport(${report.id}): tier=${report.biasTier}, score=${scorePercent}%, ` +
    `flags=${flagCount}` +
    (top ? `, top="${top}"` : "")
  );
}
