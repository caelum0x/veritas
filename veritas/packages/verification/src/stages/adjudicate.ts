// Adjudicate stage: assign verdict + confidence to each claim using LLM reasoning.

import {
  mapWithConcurrency,
  InternalError,
  isOk,
  clampScore,
  Verdict,
} from "@veritas/core";
import type { ClaimId } from "@veritas/core";
import type { ClaimAdjudication } from "@veritas/llm";
import type {
  VerificationContext,
  AdjudicatedClaim,
  PipelineCitation,
} from "../pipeline/context.js";

/** Default concurrency for adjudication calls. */
const DEFAULT_CONCURRENCY = 4;

/**
 * Collapse the evidence items on a `ClaimAdjudication` into `PipelineCitation` records
 * that the report builder can reference.
 */
function buildCitations(adj: ClaimAdjudication): ReadonlyArray<PipelineCitation> {
  const supporting = adj.supportingEvidence.map((e) => ({
    url: e.url,
    title: e.title,
    quote: e.snippet,
    supports: true,
  }));
  const contradicting = adj.contradictingEvidence.map((e) => ({
    url: e.url,
    title: e.title,
    quote: e.snippet,
    supports: false,
  }));
  return [...supporting, ...contradicting];
}

/**
 * Pipeline stage that calls `llm.adjudicate` for each researched claim.
 *
 * - Passes the corresponding `ResearchResult` so the LLM can anchor verdicts in
 *   already-gathered evidence.
 * - Applies a minimum confidence threshold: claims falling below it are demoted
 *   to `UNVERIFIABLE` regardless of the LLM's raw verdict.
 * - Stores structured `AdjudicatedClaim[]` in `ctx.adjudicatedClaims`.
 * - Stores raw `ClaimAdjudication` map in `ctx.adjudications` for downstream stages.
 */
export async function adjudicateStage(ctx: VerificationContext): Promise<void> {
  const logger = ctx.options.logger;
  const { llm } = ctx.options;
  const concurrency = ctx.options.concurrency ?? DEFAULT_CONCURRENCY;
  const minConfidence = ctx.options.effort === "low" ? 0.3 : 0.4;

  logger?.info("adjudicate: starting", {
    claims: ctx.claims.length,
    concurrency,
    minConfidence,
  });

  const rawEntries = await mapWithConcurrency(
    ctx.claims,
    concurrency,
    async (claim): Promise<[ClaimId, ClaimAdjudication]> => {
      const researchResult = ctx.research.get(claim.id);

      const result = await llm.adjudicate(claim.text, {
        researchResult,
        signal: ctx.options.signal,
      });

      if (!isOk(result)) {
        throw new InternalError({
          message: `Adjudication failed for claim "${claim.text.slice(0, 80)}": ${result.error.message}`,
          cause: result.error,
        });
      }

      logger?.debug("adjudicate: claim done", {
        claimId: claim.id,
        verdict: result.value.verdict,
        confidence: result.value.confidence,
      });

      return [claim.id, result.value];
    },
  );

  const adjMap = new Map<ClaimId, ClaimAdjudication>(rawEntries);

  let tokensUsed = 0;
  const adjudicated: AdjudicatedClaim[] = [];

  for (const claim of ctx.claims) {
    const adj = adjMap.get(claim.id);
    if (adj == null) continue;

    tokensUsed += adj.tokensUsed;

    // Clamp confidence into valid Score range.
    const confidence = clampScore(adj.confidence);

    // Demote low-confidence verdicts to UNVERIFIABLE.
    const verdict: Verdict =
      confidence < minConfidence ? Verdict.UNVERIFIABLE : adj.verdict;

    adjudicated.push({
      claim,
      verdict,
      confidence,
      reasoning: adj.explanation,
      citations: buildCitations(adj),
      tokensUsed: adj.tokensUsed,
    });
  }

  ctx.adjudications = adjMap;
  ctx.adjudicatedClaims = adjudicated;
  ctx.totalTokensUsed += tokensUsed;

  logger?.info("adjudicate: done", {
    adjudicated: adjudicated.length,
    totalTokensUsed: tokensUsed,
  });
}
