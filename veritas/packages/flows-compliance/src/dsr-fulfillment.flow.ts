// DSR fulfillment flow: verify identity -> collect subject data -> deliver portability export.
import { type Result, ok, err, tryAsync, type Clock } from "@veritas/core";
import {
  type DsrRequest,
  type CreateDsrRequest,
  type DsrStore,
  type IdentityVerifierPort,
  IdentityVerificationService,
} from "@veritas/gdpr";
import type { Logger } from "@veritas/observability";

export interface DataCollector {
  collectForSubject(subjectId: string): Promise<Record<string, unknown>>;
}

export interface DsrDelivery {
  deliver(dsrId: string, subjectEmail: string, data: Record<string, unknown>): Promise<void>;
}

export interface DsrFulfillmentDeps {
  readonly store: DsrStore;
  readonly identityVerifier: IdentityVerifierPort;
  readonly collector: DataCollector;
  readonly delivery: DsrDelivery;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface DsrFulfillmentInput {
  readonly createDsr: CreateDsrRequest;
  readonly tokenId: string;
  readonly otp: string;
}

export interface DsrFulfillmentOutput {
  readonly dsr: DsrRequest;
  readonly recordCount: number;
  readonly deliveredAt: string;
}

export async function runDsrFulfillmentFlow(
  deps: DsrFulfillmentDeps,
  input: DsrFulfillmentInput,
): Promise<Result<DsrFulfillmentOutput>> {
  const { store, identityVerifier, collector, delivery, clock, logger } = deps;
  const { createDsr, tokenId, otp } = input;

  // Step 1: Create the DSR record
  const createResult = await tryAsync(() => store.createDsr(createDsr));
  if (!createResult.ok) return err(createResult.error);
  const dsr = createResult.value;
  logger.info("DSR created", { dsrId: dsr.id, type: dsr.type });

  // Step 2: Verify identity
  const verifier = new IdentityVerificationService(identityVerifier, clock);
  const verifyResult = await verifier.verifyWithOtp(
    dsr.subject,
    tokenId,
    otp,
    dsr.subject.email ? "email_otp" : "account_credentials",
  );
  if (!verifyResult.ok) return err(verifyResult.error);
  if (!verifyResult.value.verified) {
    return err(new Error(`Identity verification failed: ${verifyResult.value.failureReason ?? "unknown"}`));
  }

  const now = clock.nowIso();
  const statusResult = await store.updateDsrStatus(dsr.id, "identity_verified", {
    verifiedAt: now,
    verificationMethod: verifyResult.value.method,
  });
  if (!statusResult.ok) return err(statusResult.error);

  // Step 3: Collect subject data
  const collectResult = await tryAsync(() => collector.collectForSubject(dsr.subject.id));
  if (!collectResult.ok) return err(collectResult.error);
  const data = collectResult.value;
  const recordCount = Object.keys(data).length;
  logger.info("Subject data collected", { dsrId: dsr.id, recordCount });

  // Step 4: Mark in_progress and deliver
  await store.updateDsrStatus(dsr.id, "in_progress");
  const deliverResult = await tryAsync(() => delivery.deliver(dsr.id, dsr.subject.email, data));
  if (!deliverResult.ok) return err(deliverResult.error);

  // Step 5: Mark completed
  const completedAt = clock.nowIso();
  const completedResult = await store.updateDsrStatus(dsr.id, "completed", { completedAt });
  if (!completedResult.ok) return err(completedResult.error);

  logger.info("DSR fulfilled", { dsrId: dsr.id });
  return ok({ dsr: completedResult.value, recordCount, deliveredAt: completedAt });
}
