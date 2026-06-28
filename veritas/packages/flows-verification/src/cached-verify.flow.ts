// Flow: check knowledge cache for prior verdict → skip or run verification → store result.
import { ok, err, isErr, isOk, newId, Verdict } from "@veritas/core";
import type { Result, AppError, EventBus, Logger } from "@veritas/core";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { VerifierLLM } from "@veritas/llm";
import { fingerprintClaim, makeKnowledgeRecord } from "@veritas/knowledge";
import type { FactCache } from "@veritas/knowledge";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowCompleted,
  makeVerificationFlowFailed,
  makeCacheHitEvent,
} from "./events.js";

export interface CachedVerifyDeps {
  readonly llm: VerifierLLM;
  readonly factCache: FactCache;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly concurrency?: number;
  readonly effort?: "low" | "standard" | "high";
  readonly maxClaims?: number;
}

export interface CachedVerifyInput {
  readonly request: VerificationRequest;
  /** If true, bypass cache and always re-verify. Default false. */
  readonly forceRefresh?: boolean;
}

export interface CachedVerifyOutput {
  /** Set when a fresh verification ran; null on cache hit. */
  readonly report: VerificationReport | null;
  readonly fromCache: boolean;
  /** Present on cache hit. */
  readonly cachedVerdict?: string;
  /** Present on cache hit. */
  readonly cachedConfidence?: number;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/** Look up a prior verdict in the fact cache before running the full verification engine. */
export async function cachedVerifyFlow(
  deps: CachedVerifyDeps,
  input: CachedVerifyInput
): Promise<Result<CachedVerifyOutput, AppError>> {
  const { llm, factCache, eventBus, logger, concurrency, effort, maxClaims } = deps;
  const { request, forceRefresh = false } = input;

  const claimText = request.text ?? (request.claims ?? []).join(" ");
  const fingerprint = fingerprintClaim(claimText);

  if (!forceRefresh) {
    const cached = factCache.get(fingerprint);
    if (isOk(cached)) {
      const record = cached.value;
      eventBus.publish(makeCacheHitEvent(fingerprint));
      logger.info("cachedVerifyFlow: cache hit", {
        fingerprint,
        verdict: record.verdict,
        confidence: record.confidence,
      });
      return ok({
        report: null,
        fromCache: true,
        cachedVerdict: record.verdict,
        cachedConfidence: record.confidence,
        totalTokensUsed: 0,
        durationMs: 0,
      });
    }
  }

  eventBus.publish(makeVerificationFlowStarted(claimText));
  logger.info("cachedVerifyFlow: cache miss, verifying", { fingerprint });

  const start = Date.now();
  const verifyResult = await runVerification(request, {
    llm,
    logger,
    concurrency,
    effort,
    maxClaims,
  });

  if (isErr(verifyResult)) {
    const reason = verifyResult.error.message;
    eventBus.publish(makeVerificationFlowFailed(reason));
    logger.error("cachedVerifyFlow: verification failed", { reason });
    return err(verifyResult.error);
  }

  const { report, totalTokensUsed, durationMs } = verifyResult.value;
  eventBus.publish(makeVerificationFlowCompleted(report));

  // Derive a dominant verdict from counts for caching purposes.
  const { supported, refuted, unverifiable } = report.counts;
  let dominantVerdict: typeof Verdict[keyof typeof Verdict] = Verdict.UNVERIFIABLE;
  if (supported >= refuted && supported >= unverifiable) dominantVerdict = Verdict.SUPPORTED;
  else if (refuted > supported && refuted >= unverifiable) dominantVerdict = Verdict.REFUTED;

  const record = makeKnowledgeRecord({
    id: newId("kr"),
    fingerprint,
    claimText,
    verdict: dominantVerdict,
    confidence: report.trustScore / 100,
    summary: report.summary,
    citationUrls: report.claims.flatMap((c) => c.citations.map((cit) => cit.url)),
  });
  factCache.set(record);

  logger.info("cachedVerifyFlow completed", {
    trustScore: report.trustScore,
    durationMs,
  });

  return ok({ report, fromCache: false, totalTokensUsed, durationMs });
}
