// Research stage: gather web evidence for every deduplicated claim via the LLM.

import { mapWithConcurrency, InternalError, isOk } from "@veritas/core";
import type { ClaimId } from "@veritas/core";
import type { ResearchResult } from "@veritas/llm";
import type { VerificationContext } from "../pipeline/context.js";

/** Default number of concurrent research LLM calls. */
const DEFAULT_CONCURRENCY = 4;

/** Default max search queries per claim. */
const DEFAULT_MAX_SEARCH_QUERIES = 5;

/**
 * Pipeline stage that calls `llm.research` for each claim concurrently.
 *
 * - Respects `options.concurrency` to avoid overwhelming the LLM provider.
 * - Propagates research failures as `InternalError` so the pipeline can surface them.
 * - Stores results in `ctx.research` keyed by `ClaimId`.
 * - Accumulates token usage onto `ctx.totalTokensUsed`.
 */
export async function researchStage(ctx: VerificationContext): Promise<void> {
  const logger = ctx.options.logger;
  const { llm } = ctx.options;
  const concurrency = ctx.options.concurrency ?? DEFAULT_CONCURRENCY;
  const maxSearchQueries =
    ctx.options.maxSearchQueries ?? DEFAULT_MAX_SEARCH_QUERIES;

  logger?.info("research: starting", {
    claims: ctx.claims.length,
    concurrency,
    maxSearchQueries,
  });

  const entries = await mapWithConcurrency(
    ctx.claims,
    concurrency,
    async (claim): Promise<[ClaimId, ResearchResult]> => {
      const result = await llm.research(claim.text, {
        maxSearchQueries,
        enableWebSearch: true,
        signal: ctx.options.signal,
      });

      if (!isOk(result)) {
        throw new InternalError({
          message: `Research failed for claim "${claim.text.slice(0, 80)}": ${result.error.message}`,
          cause: result.error,
        });
      }

      logger?.debug("research: claim done", {
        claimId: claim.id,
        evidenceCount: result.value.evidence.length,
        tokensUsed: result.value.tokensUsed,
      });

      return [claim.id, result.value];
    },
  );

  const researchMap = new Map<ClaimId, ResearchResult>(entries);

  let tokensUsed = 0;
  for (const r of researchMap.values()) {
    tokensUsed += r.tokensUsed;
  }

  ctx.research = researchMap;
  ctx.totalTokensUsed += tokensUsed;

  logger?.info("research: done", {
    claims: researchMap.size,
    totalTokensUsed: tokensUsed,
  });
}
