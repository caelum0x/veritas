// Flow: verify claims → run quality gates → finalize or reject based on gate outcomes.
import { ok, err, isErr, epochToIso, toAppError } from "@veritas/core";
import type { Result, AppError, EventBus, Logger } from "@veritas/core";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { VerifierLLM } from "@veritas/llm";
import { runPipeline } from "@veritas/quality-gates";
import type { QualityGate, PipelineOutcome } from "@veritas/quality-gates";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowCompleted,
  makeVerificationFlowFailed,
  makeQualityGatePassedEvent,
  makeQualityGateFailedEvent,
} from "./events.js";
import { FlowQualityGateError } from "./errors.js";

export interface QualityGatedVerifyDeps {
  readonly llm: VerifierLLM;
  readonly qualityGates: ReadonlyArray<QualityGate>;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly concurrency?: number;
  readonly effort?: "low" | "standard" | "high";
  readonly maxClaims?: number;
  /** When true, non-passing gates block the flow with an error. Default true. */
  readonly blockOnFailure?: boolean;
}

export interface QualityGatedVerifyInput {
  readonly request: VerificationRequest;
}

export interface QualityGatedVerifyOutput {
  readonly report: VerificationReport;
  readonly gateOutcome: PipelineOutcome;
  readonly qualityPassed: boolean;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/** Verify claims and then enforce quality gates before returning the report. */
export async function qualityGatedVerifyFlow(
  deps: QualityGatedVerifyDeps,
  input: QualityGatedVerifyInput
): Promise<Result<QualityGatedVerifyOutput, AppError>> {
  const {
    llm,
    qualityGates,
    eventBus,
    logger,
    concurrency,
    effort,
    maxClaims,
    blockOnFailure = true,
  } = deps;
  const { request } = input;

  eventBus.publish(makeVerificationFlowStarted(request.text ?? ""));
  logger.info("qualityGatedVerifyFlow started", { text: (request.text ?? "").slice(0, 80) });

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
    logger.error("qualityGatedVerifyFlow: verification failed", { reason });
    return err(verifyResult.error);
  }

  const { report, totalTokensUsed, durationMs } = verifyResult.value;
  eventBus.publish(makeVerificationFlowCompleted(report));

  // Build the gate input from the report.
  const gateInput = {
    report,
    evidenceByClaimId: {} as Record<string, readonly unknown[]>,
    citations: report.claims.flatMap((c) => c.citations),
    sources: [],
    asOf: epochToIso(Date.now()),
  };

  const gateResult = await runPipeline(qualityGates, gateInput, {
    abortOnFirstFailure: false,
  });

  if (isErr(gateResult)) {
    const appErr = toAppError(gateResult.error);
    logger.error("qualityGatedVerifyFlow: gate pipeline error", {
      reason: appErr.message,
    });
    return err(appErr);
  }

  const gateOutcome = gateResult.value;
  const blockingCount = gateOutcome.results.filter((r) => !r.passed).length;

  if (gateOutcome.passed) {
    eventBus.publish(makeQualityGatePassedEvent());
    logger.info("qualityGatedVerifyFlow: quality gates passed", { trustScore: report.trustScore });
  } else {
    eventBus.publish(makeQualityGateFailedEvent(blockingCount));
    logger.warn("qualityGatedVerifyFlow: quality gates failed", { blockingCount });

    if (blockOnFailure) {
      return err(
        toAppError(
          new FlowQualityGateError(
            `${blockingCount} quality gate(s) failed; report blocked from finalization`
          )
        )
      );
    }
  }

  return ok({
    report,
    gateOutcome,
    qualityPassed: gateOutcome.passed,
    totalTokensUsed,
    durationMs,
  });
}
