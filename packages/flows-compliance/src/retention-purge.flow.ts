// Retention-purge flow: evaluate records against retention policies then execute purge actions.
import { type Result, ok, err, tryAsync, type Clock } from "@veritas/core";
import {
  type RecordRef,
  type RetentionPolicy,
  type LegalHold,
  type PurgeRecord,
  type PurgeExecutor,
  evaluateRecords,
  filterActionable,
  makePurgeRecord,
  executePurgeBatch,
} from "@veritas/retention";
import type { Logger } from "@veritas/observability";

export interface RetentionPurgeFlowDeps {
  readonly policyRegistry: PolicyRegistry;
  readonly holdRegistry: HoldRegistry;
  readonly purgeExecutor: PurgeExecutor;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface PolicyRegistry {
  findByCategory(category: string): RetentionPolicy | null;
}

export interface HoldRegistry {
  listActive(): Promise<readonly LegalHold[]>;
}

export interface RetentionPurgeInput {
  readonly records: readonly RecordRef[];
  readonly concurrency?: number;
}

export interface RetentionPurgeOutput {
  readonly evaluated: number;
  readonly actioned: number;
  readonly skipped: number;
  readonly failed: number;
  readonly purgeRecords: readonly PurgeRecord[];
  readonly runAt: string;
}

export async function runRetentionPurgeFlow(
  deps: RetentionPurgeFlowDeps,
  input: RetentionPurgeInput,
): Promise<Result<RetentionPurgeOutput>> {
  const { policyRegistry, holdRegistry, purgeExecutor, clock, logger } = deps;
  const { records, concurrency = 5 } = input;

  const nowIso = clock.nowIso();
  logger.info("Retention purge started", { recordCount: records.length });

  // Step 1: Load active legal holds
  const holdsResult = await tryAsync(() => holdRegistry.listActive());
  if (!holdsResult.ok) return err(holdsResult.error);
  const holds = holdsResult.value;

  // Step 2: Evaluate all records against policies and holds
  const evaluations = evaluateRecords(
    records,
    (cat) => policyRegistry.findByCategory(cat),
    holds,
    nowIso,
  );

  // Step 3: Filter to only records that are expired and not on hold
  const actionable = filterActionable(evaluations);
  const skipped = evaluations.length - actionable.length;
  logger.info("Retention evaluated", { total: evaluations.length, actionable: actionable.length, skipped });

  // Step 4: Build purge records
  const purgeRecords: PurgeRecord[] = actionable
    .filter((e) => e.action !== null && e.policyId !== null)
    .map((e) => makePurgeRecord(e.policyId!, e.category, e.recordId, e.action!));

  // Step 5: Execute purge batch
  const executedResult = await tryAsync(() => executePurgeBatch(purgeRecords, purgeExecutor, concurrency));
  if (!executedResult.ok) return err(executedResult.error);
  const executed = executedResult.value;

  const actioned = executed.filter((r) => r.status === "completed").length;
  const failed = executed.filter((r) => r.status === "failed").length;
  logger.info("Retention purge completed", { actioned, failed });

  return ok({
    evaluated: evaluations.length,
    actioned,
    skipped,
    failed,
    purgeRecords: executed,
    runAt: nowIso,
  });
}
