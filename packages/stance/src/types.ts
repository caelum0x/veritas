// Shared types for the stance package
import { z } from "zod";
import type { Stance } from "./stance.js";

export const StanceConfidenceSchema = z.object({
  stance:     z.enum(["supports", "opposes", "neutral"]),
  confidence: z.number().min(0).max(1),
  reasoning:  z.string().optional(),
});
export type StanceConfidence = z.infer<typeof StanceConfidenceSchema>;

/** A single citation's stance result */
export interface CitationStance {
  readonly citationId:  string;
  readonly sourceId:    string | null;
  readonly url:         string | null;
  readonly snippet:     string;
  readonly stance:      Stance;
  readonly confidence:  number;
  readonly reasoning:   string;
  /** Authority weight 0-1 assigned by source tier */
  readonly weight:      number;
}

/** Aggregated stance across multiple citations */
export interface AggregatedStance {
  readonly dominant:   Stance;
  readonly confidence: number;
  readonly supporting: number;
  readonly opposing:   number;
  readonly neutral:    number;
  readonly total:      number;
}

/** Context provided to stance detection */
export interface StanceContext {
  readonly claimText:   string;
  readonly domainHint?: string;
  readonly modelId?:    string;
}

/** Weighted evidence signal for aggregation */
export interface WeightedStance {
  readonly stance:     Stance;
  readonly confidence: number;
  readonly weight:     number;
}

/** Disagreement measurement between stances */
export interface DisagreementReport {
  /** Proportion of opposing signals (0 = unanimous, 1 = fully split) */
  readonly score:       number;
  readonly supporting:  number;
  readonly opposing:    number;
  readonly neutral:     number;
  readonly total:       number;
  readonly isControversial: boolean;
}

/** Final scored stance result */
export interface ScoredStance {
  readonly stance:     Stance;
  /** Weighted confidence incorporating authority and agreement */
  readonly score:      number;
  readonly disagreement: DisagreementReport;
}
