// to-verification: converts extracted claim candidates into verification requests and dispatches them.

import { ok, err, isErr } from "@veritas/core";
import type { Result, Logger, AppError } from "@veritas/core";
import { extractClaimCandidates } from "@veritas/ingestion";
import type { IngestedDocument, ClaimCandidate } from "@veritas/ingestion";
import { runVerification } from "@veritas/verification";
import type { EngineOptions } from "@veritas/verification";

export interface VerificationDispatchResult {
  readonly candidateCount: number;
  readonly dispatchedCount: number;
  readonly skippedCount: number;
}

export interface ToVerificationOptions {
  readonly engineOptions: EngineOptions;
  readonly logger?: Logger;
  /** Minimum candidate text length forwarded to verification (default 40). */
  readonly minCandidateLength?: number;
  /** Maximum candidates forwarded per document (default 50). */
  readonly maxCandidates?: number;
}

/** Build a plain-text block from claim candidates for the verification engine. */
function buildClaimsText(candidates: readonly ClaimCandidate[]): string {
  return candidates.map((c) => c.text).join("\n");
}

/**
 * Extract claim candidates from an ingested document and dispatch them
 * to the verification engine, returning a summary of what happened.
 */
export async function dispatchToVerification(
  doc: IngestedDocument,
  options: ToVerificationOptions,
): Promise<Result<VerificationDispatchResult, AppError>> {
  const logger = options.engineOptions.logger;
  const minLength = options.minCandidateLength ?? 40;
  const maxCandidates = options.maxCandidates ?? 50;

  const all = extractClaimCandidates(doc, {
    minLength,
    maxCandidates,
    includeContext: true,
  });

  if (all.length === 0) {
    logger?.info("to-verification: no claim candidates extracted", {
      documentId: doc.id,
    });
    return ok({ candidateCount: 0, dispatchedCount: 0, skippedCount: 0 });
  }

  const candidates = all.slice(0, maxCandidates);
  const skippedCount = all.length - candidates.length;

  const claimsText = buildClaimsText(candidates);

  const request = {
    text: claimsText,
    sourceUrl: doc.sourceRef.url,
    language: doc.language ?? undefined,
  };

  logger?.info("to-verification: dispatching claims", {
    documentId: doc.id,
    candidateCount: candidates.length,
  });

  const result = await runVerification(request, options.engineOptions);

  if (isErr(result)) {
    logger?.error("to-verification: verification engine failed", {
      documentId: doc.id,
      errorCode: result.error.code,
      message: result.error.message,
    });
    return err(result.error);
  }

  logger?.info("to-verification: verification complete", {
    documentId: doc.id,
    dispatchedCount: candidates.length,
    trustScore: result.value.report.trustScore,
    durationMs: result.value.durationMs,
  });

  return ok({
    candidateCount: all.length,
    dispatchedCount: candidates.length,
    skippedCount,
  });
}
