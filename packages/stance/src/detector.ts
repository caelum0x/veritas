// StanceDetector: top-level orchestrator classifying source stance toward a claim
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { LLMStancePort } from "./llm-stance.js";
import { classifyAllCitationStances } from "./evidence-stance.js";
import type { CitationInput } from "./evidence-stance.js";
import { aggregateStances } from "./aggregate.js";
import { StanceDetectionError } from "./errors.js";
import type { AggregatedStance, StanceContext } from "./types.js";

export interface DetectorOptions {
  /** Max concurrent LLM calls per batch */
  readonly concurrency?: number;
  /** Minimum citations required to produce a non-neutral result */
  readonly minCitations?: number;
}

export interface DetectionResult {
  readonly aggregate:  AggregatedStance;
  readonly errorCount: number;
}

/**
 * Classify the overall stance of a set of citations toward a claim.
 * Returns an aggregated stance signal and any per-citation error count.
 */
export async function detectStance(
  citations: ReadonlyArray<CitationInput>,
  ctx: StanceContext,
  port: LLMStancePort,
  opts: DetectorOptions = {},
): Promise<Result<DetectionResult, StanceDetectionError>> {
  const concurrency   = opts.concurrency  ?? 4;
  const minCitations  = opts.minCitations ?? 1;

  if (citations.length < minCitations) {
    return ok({
      aggregate:  { dominant: "neutral", confidence: 0, supporting: 0, opposing: 0, neutral: 0, total: 0 },
      errorCount: 0,
    });
  }

  const { stances, errors } = await classifyAllCitationStances(citations, ctx, port, concurrency);

  if (stances.length === 0 && errors.length > 0) {
    return err(new StanceDetectionError(
      `All ${errors.length} citation(s) failed stance classification`,
      errors[0],
    ));
  }

  const aggregate = aggregateStances(stances);
  return ok({ aggregate, errorCount: errors.length });
}
