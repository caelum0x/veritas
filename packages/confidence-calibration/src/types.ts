// Shared domain types for confidence-calibration package
import { z } from "zod";
import type { Verdict } from "@veritas/core";

/** A raw (uncalibrated) model confidence score in [0, 1]. */
export type RawConfidence = number;

/** A calibrated confidence score in [0, 1]. */
export type CalibratedConfidence = number;

/** Supported calibration strategy names. */
export type CalibrationStrategy = "platt" | "isotonic" | "temperature" | "ensemble";

/** Verdict with an attached raw confidence score, as produced by the core engine. */
export interface ScoredVerdict {
  readonly verdict: Verdict;
  readonly rawConfidence: RawConfidence;
  /** Optional source identifier (e.g. claim ID) for traceability. */
  readonly sourceId?: string;
}

/** A verdict after calibration has been applied. */
export interface CalibratedVerdict {
  readonly verdict: Verdict;
  readonly rawConfidence: RawConfidence;
  readonly calibratedConfidence: CalibratedConfidence;
  /** Which strategy produced the calibrated score. */
  readonly strategy: CalibrationStrategy;
  readonly sourceId?: string;
}

/** Persisted snapshot of a calibrator's fitted state. */
export interface CalibrationSnapshot {
  readonly strategy: CalibrationStrategy;
  readonly params: Readonly<Record<string, unknown>>;
  readonly fittedAt: string; // ISO timestamp
  readonly sampleCount: number;
}

/** Summary metrics produced after evaluating a calibrated model. */
export interface CalibrationMetrics {
  readonly ece: number;
  readonly mce: number;
  readonly brierScore: number;
  readonly sampleCount: number;
  readonly strategy: CalibrationStrategy;
}

/** Zod schema for a calibration snapshot (for deserialization / API validation). */
export const calibrationSnapshotSchema = z.object({
  strategy: z.enum(["platt", "isotonic", "temperature", "ensemble"]),
  params: z.record(z.unknown()),
  fittedAt: z.string().datetime(),
  sampleCount: z.number().int().nonnegative(),
});

/** Zod schema for scored verdict input. */
export const scoredVerdictSchema = z.object({
  verdict: z.string(),
  rawConfidence: z.number().min(0).max(1),
  sourceId: z.string().optional(),
});
