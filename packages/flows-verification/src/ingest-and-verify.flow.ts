// Flow: ingest document from URL → extract claims → run verification → report.
import { ok, err, isErr, toAppError } from "@veritas/core";
import type { Result, AppError, EventBus, Logger } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { VerifierLLM } from "@veritas/llm";
import {
  IngestionPipeline,
  makeSourceRef,
  extractClaimCandidates,
} from "@veritas/ingestion";
import type { FetcherPort } from "@veritas/ingestion";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowCompleted,
  makeVerificationFlowFailed,
  makeIngestionFlowCompleted,
} from "./events.js";

export interface IngestAndVerifyDeps {
  readonly llm: VerifierLLM;
  readonly fetcher: FetcherPort;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly concurrency?: number;
  readonly effort?: "low" | "standard" | "high";
  readonly maxClaims?: number;
}

export interface IngestAndVerifyInput {
  readonly url: string;
  readonly mimeType?: string;
}

export interface IngestAndVerifyOutput {
  readonly report: VerificationReport;
  readonly documentId: string;
  readonly claimsExtracted: number;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/** Fetch a document, extract claim candidates, then run full verification. */
export async function ingestAndVerifyFlow(
  deps: IngestAndVerifyDeps,
  input: IngestAndVerifyInput
): Promise<Result<IngestAndVerifyOutput, AppError>> {
  const { llm, fetcher, eventBus, logger, concurrency, effort, maxClaims } = deps;
  const { url, mimeType } = input;

  logger.info("ingestAndVerifyFlow started", { url });

  const pipeline = new IngestionPipeline({ fetcher });
  const sourceRef = makeSourceRef(url, mimeType ? { mimeType } : undefined);

  const ingestResult = await pipeline.ingest(sourceRef);
  if (isErr(ingestResult)) {
    const appErr = toAppError(ingestResult.error);
    logger.error("ingestAndVerifyFlow: ingestion failed", { url, reason: appErr.message });
    return err(appErr);
  }

  const document = ingestResult.value;
  const candidates = extractClaimCandidates(document, { maxCandidates: maxClaims ?? 20 });
  const combinedText = candidates.map((c) => c.text).join("\n");

  logger.info("ingestAndVerifyFlow: claims extracted", {
    documentId: document.id,
    count: candidates.length,
  });

  eventBus.publish(makeVerificationFlowStarted(combinedText));

  const verifyResult = await runVerification(
    { text: combinedText },
    { llm, logger, concurrency, effort, maxClaims }
  );

  if (isErr(verifyResult)) {
    const reason = verifyResult.error.message;
    eventBus.publish(makeVerificationFlowFailed(reason));
    logger.error("ingestAndVerifyFlow: verification failed", { reason });
    return err(verifyResult.error);
  }

  const { report, totalTokensUsed, durationMs } = verifyResult.value;
  eventBus.publish(makeVerificationFlowCompleted(report));
  eventBus.publish(makeIngestionFlowCompleted(document.id));
  logger.info("ingestAndVerifyFlow completed", {
    trustScore: report.trustScore,
    durationMs,
  });

  return ok({
    report,
    documentId: document.id,
    claimsExtracted: candidates.length,
    totalTokensUsed,
    durationMs,
  });
}
