// Flow: verify claims → attest report on-chain → return provenance.
import { ok, err, isErr, newId, toAppError } from "@veritas/core";
import type { Result, AppError, EventBus, Logger } from "@veritas/core";
import type { VerificationRequest, VerificationReport } from "@veritas/contracts";
import { runVerification } from "@veritas/verification";
import type { VerifierLLM } from "@veritas/llm";
import { ReportAttester } from "@veritas/attestation";
import type {
  OnchainPort,
  AttestationRecordStore,
  ReportAttestOptions,
  ReportAttestResult,
} from "@veritas/attestation";
import {
  makeVerificationFlowStarted,
  makeVerificationFlowCompleted,
  makeVerificationFlowFailed,
  makeAttestationFlowCompleted,
} from "./events.js";

export interface VerifyAndAttestDeps {
  readonly llm: VerifierLLM;
  readonly onchainPort: OnchainPort;
  readonly attestationRecordStore: AttestationRecordStore;
  readonly eventBus: EventBus;
  readonly logger: Logger;
  readonly concurrency?: number;
  readonly effort?: "low" | "standard" | "high";
}

export interface VerifyAndAttestInput {
  readonly request: VerificationRequest;
  readonly attestOptions: ReportAttestOptions;
}

export interface VerifyAndAttestOutput {
  readonly report: VerificationReport;
  readonly attestation: ReportAttestResult;
  readonly totalTokensUsed: number;
  readonly durationMs: number;
}

/** Verify claims then anchor the resulting report on-chain via EAS-style attestation. */
export async function verifyAndAttestFlow(
  deps: VerifyAndAttestDeps,
  input: VerifyAndAttestInput
): Promise<Result<VerifyAndAttestOutput, AppError>> {
  const { llm, onchainPort, attestationRecordStore, eventBus, logger, concurrency, effort } = deps;
  const { request, attestOptions } = input;

  eventBus.publish(makeVerificationFlowStarted(request.text ?? ""));
  logger.info("verifyAndAttestFlow started", { text: (request.text ?? "").slice(0, 80) });

  const verifyResult = await runVerification(request, {
    llm,
    logger,
    concurrency,
    effort,
  });

  if (isErr(verifyResult)) {
    const reason = verifyResult.error.message;
    eventBus.publish(makeVerificationFlowFailed(reason));
    logger.error("verifyAndAttestFlow: verification failed", { reason });
    return err(verifyResult.error);
  }

  const { report, totalTokensUsed, durationMs } = verifyResult.value;
  eventBus.publish(makeVerificationFlowCompleted(report));
  logger.info("verifyAndAttestFlow: verification complete, attesting", {
    trustScore: report.trustScore,
  });

  const reportId = newId("rpt");
  const verificationId = newId("vrf");

  const attester = new ReportAttester(onchainPort, attestationRecordStore);
  const attestResult = await attester.attest(report, reportId, verificationId, attestOptions);

  if (isErr(attestResult)) {
    const appErr = toAppError(attestResult.error);
    logger.error("verifyAndAttestFlow: attestation failed", { reason: appErr.message });
    return err(appErr);
  }

  const attestation = attestResult.value;
  eventBus.publish(makeAttestationFlowCompleted(attestation.uid));
  logger.info("verifyAndAttestFlow completed", {
    attestationUid: attestation.uid,
    trustScore: report.trustScore,
  });

  return ok({ report, attestation, totalTokensUsed, durationMs });
}
