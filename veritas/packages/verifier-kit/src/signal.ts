// Verdict signal: a weighted evidence signal emitted by a specialized verifier.

import { z } from "zod";
import { type Verdict, verdictSchema } from "@veritas/core";

/** A single weighted signal contributing to an aggregate verdict. */
export interface VerdictSignal {
  /** Verifier that produced this signal. */
  readonly verifierId: string;
  /** The raw verdict suggested by this signal. */
  readonly verdict: Verdict;
  /** Confidence in this signal [0, 1]. */
  readonly confidence: number;
  /** Human-readable rationale for the signal. */
  readonly rationale: string;
  /** Optional source URL(s) that back this signal. */
  readonly sources: readonly string[];
  /** Relative importance weight for aggregation [0, 1]. */
  readonly weight: number;
}

export const verdictSignalSchema = z.object({
  verifierId: z.string().min(1),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  sources: z.array(z.string().url()),
  weight: z.number().min(0).max(1),
});

/** Construct a VerdictSignal, clamping numeric fields to [0, 1]. */
export function makeVerdictSignal(
  init: Omit<VerdictSignal, "sources"> & { sources?: readonly string[] }
): VerdictSignal {
  return {
    verifierId: init.verifierId,
    verdict: init.verdict,
    confidence: Math.min(1, Math.max(0, init.confidence)),
    rationale: init.rationale,
    sources: init.sources ?? [],
    weight: Math.min(1, Math.max(0, init.weight)),
  };
}
