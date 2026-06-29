// Resolve-claims stage: extract discrete factual claims from normalized text via LLM.

import { newClaimId, isOk, ValidationError } from "@veritas/core";
import type { VerificationContext, PipelineClaim } from "../pipeline/context.js";

/** Default maximum number of claims to extract when none is configured. */
const DEFAULT_MAX_CLAIMS = 20;

/** Minimum check-worthiness score to retain an extracted claim. */
const MIN_CHECKWORTHINESS = 0.2;

/**
 * Pipeline stage that calls the LLM to extract claims from the normalized text.
 *
 * - Calls `llm.extractClaims` with the normalized text.
 * - Filters low check-worthiness claims.
 * - Caps at `options.maxClaims`.
 * - Stores structured `PipelineClaim[]` on `ctx.claims`.
 */
export async function resolveClaimsStage(
  ctx: VerificationContext,
): Promise<void> {
  const logger = ctx.options.logger;
  const maxClaims = ctx.options.maxClaims ?? DEFAULT_MAX_CLAIMS;
  const { llm } = ctx.options;

  logger?.info("resolve-claims: extracting", { maxClaims });

  const result = await llm.extractClaims(ctx.normalizedText, {
    maxClaims,
    signal: ctx.options.signal,
  });

  if (!isOk(result)) {
    throw new ValidationError({
      message: `Claim extraction failed: ${result.error.message}`,
    });
  }

  const { claims: extracted, tokensUsed, modelId } = result.value;

  logger?.info("resolve-claims: extracted", {
    count: extracted.length,
    tokensUsed,
    modelId,
  });

  // Filter, sort, and cap.
  const filtered = extracted
    .filter((c) => c.checkworthiness >= MIN_CHECKWORTHINESS)
    .sort((a, b) => b.checkworthiness - a.checkworthiness)
    .slice(0, maxClaims);

  const pipeline: ReadonlyArray<PipelineClaim> = filtered.map((c, idx) => ({
    id: newClaimId(),
    text: c.text,
    // Normalize: trim + collapse whitespace (simple in-place normalizer).
    normalized: c.text.trim().replace(/\s+/g, " "),
    order: idx,
  }));

  ctx.claims = pipeline;
  ctx.totalTokensUsed += tokensUsed;

  logger?.info("resolve-claims: done", { retained: pipeline.length });
}
