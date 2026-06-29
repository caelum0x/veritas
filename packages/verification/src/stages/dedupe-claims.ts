// Dedupe-claims stage: remove near-identical claims before research begins.

import type { VerificationContext, PipelineClaim } from "../pipeline/context.js";

/** Jaccard similarity threshold above which two claims are considered duplicates. */
const SIMILARITY_THRESHOLD = 0.82;

/**
 * Tokenise a claim text into a set of lowercase word tokens.
 * Strips punctuation to allow surface-form variation between near-duplicates.
 */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  return new Set(tokens);
}

/**
 * Compute Jaccard similarity between two token sets.
 * Returns 1.0 for identical sets, 0.0 for disjoint sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Pipeline stage that removes near-duplicate claims.
 *
 * Uses token-level Jaccard similarity. When two claims exceed the threshold the
 * one with the lower `order` index (i.e. higher check-worthiness rank) is kept.
 *
 * Mutates `ctx.claims` in place with the deduplicated list.
 */
export async function dedupeClaimsStage(
  ctx: VerificationContext,
): Promise<void> {
  const logger = ctx.options.logger;
  const before = ctx.claims.length;

  if (before <= 1) return;

  // Pre-compute token sets to avoid repeated tokenization.
  const tokenSets: Array<Set<string>> = ctx.claims.map((c) =>
    tokenize(c.normalized),
  );

  const kept: PipelineClaim[] = [];
  const keptTokenSets: Array<Set<string>> = [];

  for (let i = 0; i < ctx.claims.length; i++) {
    const candidate = ctx.claims[i]!;
    const candidateTokens = tokenSets[i]!;

    let isDuplicate = false;
    for (const keptTokens of keptTokenSets) {
      if (jaccardSimilarity(candidateTokens, keptTokens) >= SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(candidate);
      keptTokenSets.push(candidateTokens);
    }
  }

  ctx.claims = kept;

  const removed = before - kept.length;
  logger?.info("dedupe-claims: done", { before, after: kept.length, removed });
}
