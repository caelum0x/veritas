// Flow: claims text → verification engine → VerificationReport.
import { ok, err, isErr } from "@veritas/core";
import type { Result, AppError, EventBus, Logger } from "@veritas/core";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { VerifierLLM } from "@veritas/llm";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowCompleted,
  makeVerificationFlowFailed,
} from "./events.js";

export interface VerifyClaimsDeps {
  readonly llm: VerifierLLM;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly concurrency?: number;
  readonly maxClaims?: number;
  readonly verifier?: string;
  readonly verifierVersion?: string;
  readonly effort?: "low" | "standard" | "high";
}

export interface VerifyClaimsInput {
  readonly request: VerificationRequest;
}

export interface VerifyClaimsOutput {
  readonly report: VerificationReport;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/** Run the full verification pipeline for a set of claims and return a report. */
export async function verifyClaimsFlow(
  deps: VerifyClaimsDeps,
  input: VerifyClaimsInput
): Promise<Result<VerifyClaimsOutput, AppError>> {
  const { llm, eventBus, logger, concurrency, maxClaims, verifier, verifierVersion, effort } =
    deps;
  const { request } = input;

  eventBus.publish(makeVerificationFlowStarted(request.text ?? ""));
  logger.info("verifyClaimsFlow started", { text: (request.text ?? "").slice(0, 80) });

  const result = await runVerification(request, {
    llm,
    logger,
    concurrency,
    maxClaims,
    verifier,
    verifierVersion,
    effort,
  });

  if (isErr(result)) {
    const reason = result.error.message;
    eventBus.publish(makeVerificationFlowFailed(reason));
    logger.error("verifyClaimsFlow failed", { reason });
    return err(result.error);
  }

  const { report, totalTokensUsed, durationMs } = result.value;
  eventBus.publish(makeVerificationFlowCompleted(report));
  logger.info("verifyClaimsFlow completed", {
    trustScore: report.trustScore,
    durationMs,
  });

  return ok({ report, totalTokensUsed, durationMs });
}
