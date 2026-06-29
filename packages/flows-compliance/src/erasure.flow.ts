// Erasure flow: verify DSR -> erase subject data across stores -> confirm completion.
import { type Result, ok, err, tryAsync, type Clock } from "@veritas/core";
import {
  type DsrRequest,
  type DsrStore,
  ErasureBlockedError,
  DsrNotFoundError,
} from "@veritas/gdpr";
import type { Logger } from "@veritas/observability";

export interface ErasureStore {
  eraseBySubjectId(subjectId: string, categories: readonly string[]): Promise<{ erased: number; errors: string[] }>;
}

export interface ErasureHoldChecker {
  isBlocked(subjectId: string): Promise<{ blocked: boolean; reason?: string }>;
}

export interface ErasureFlowDeps {
  readonly dsrStore: DsrStore;
  readonly erasureStore: ErasureStore;
  readonly holdChecker: ErasureHoldChecker;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface ErasureFlowInput {
  readonly dsrId: string;
  readonly categories: readonly string[];
}

export interface ErasureFlowOutput {
  readonly dsr: DsrRequest;
  readonly erasedCount: number;
  readonly completedAt: string;
}

export async function runErasureFlow(
  deps: ErasureFlowDeps,
  input: ErasureFlowInput,
): Promise<Result<ErasureFlowOutput, ErasureBlockedError | DsrNotFoundError | Error>> {
  const { dsrStore, erasureStore, holdChecker, clock, logger } = deps;
  const { dsrId, categories } = input;

  // Step 1: Load the DSR
  const dsrResult = await dsrStore.getDsr(dsrId);
  if (!dsrResult.ok) return err(dsrResult.error);
  const dsr = dsrResult.value;

  if (dsr.type !== "erasure") {
    return err(new Error(`DSR ${dsrId} is not an erasure request (type=${dsr.type})`));
  }
  if (dsr.status !== "identity_verified" && dsr.status !== "in_progress") {
    return err(new Error(`DSR ${dsrId} is not in a state ready for erasure (status=${dsr.status})`));
  }

  // Step 2: Check for legal holds blocking erasure
  const holdResult = await tryAsync(() => holdChecker.isBlocked(dsr.subject.id));
  if (!holdResult.ok) return err(holdResult.error);
  if (holdResult.value.blocked) {
    return err(new ErasureBlockedError(holdResult.value.reason ?? "Legal hold active for subject"));
  }

  // Step 3: Mark in_progress
  await dsrStore.updateDsrStatus(dsrId, "in_progress");

  // Step 4: Erase across stores
  const eraseResult = await tryAsync(() => erasureStore.eraseBySubjectId(dsr.subject.id, categories));
  if (!eraseResult.ok) return err(eraseResult.error);
  const { erased, errors } = eraseResult.value;
  if (errors.length > 0) {
    logger.warn("Erasure completed with partial errors", { dsrId, errors });
  }
  logger.info("Subject data erased", { dsrId, erasedCount: erased });

  // Step 5: Mark completed
  const completedAt = clock.nowIso();
  const completedResult = await dsrStore.updateDsrStatus(dsrId, "completed", { completedAt });
  if (!completedResult.ok) return err(completedResult.error);

  return ok({ dsr: completedResult.value, erasedCount: erased, completedAt });
}
