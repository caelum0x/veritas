// Purge engine: executes delete/archive/anonymize actions on expired records.
import { z } from "zod";
import { newId, ok, err, type Result } from "@veritas/core";
import type { RetentionAction } from "./policy.js";

export const PurgeStatusSchema = z.enum(["pending", "running", "completed", "failed", "skipped"]);
export type PurgeStatus = z.infer<typeof PurgeStatusSchema>;

export const PurgeRecordSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  category: z.string(),
  recordId: z.string(),
  action: z.enum(["delete", "archive", "anonymize"]),
  status: PurgeStatusSchema.default("pending"),
  /** ISO timestamp when the record was scheduled for purge. */
  scheduledAt: z.string(),
  /** ISO timestamp when the purge was executed, null if not yet. */
  executedAt: z.string().nullable().default(null),
  errorMessage: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurgeRecord = z.infer<typeof PurgeRecordSchema>;

/** Port interface for executing purge actions against an external store. */
export interface PurgeExecutor {
  delete(category: string, recordId: string): Promise<Result<void>>;
  archive(category: string, recordId: string): Promise<Result<void>>;
  anonymize(category: string, recordId: string): Promise<Result<void>>;
}

/** In-memory no-op purge executor (for dev/test). */
export class NoOpPurgeExecutor implements PurgeExecutor {
  async delete(_category: string, _recordId: string): Promise<Result<void>> {
    return ok(undefined);
  }
  async archive(_category: string, _recordId: string): Promise<Result<void>> {
    return ok(undefined);
  }
  async anonymize(_category: string, _recordId: string): Promise<Result<void>> {
    return ok(undefined);
  }
}

/** Build a new pending PurgeRecord. */
export function makePurgeRecord(
  policyId: string,
  category: string,
  recordId: string,
  action: RetentionAction,
): PurgeRecord {
  const now = new Date().toISOString();
  return PurgeRecordSchema.parse({
    id: newId("purge"),
    policyId,
    category,
    recordId,
    action,
    status: "pending",
    scheduledAt: now,
    executedAt: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  });
}

/** Execute a single purge record against the provided executor. */
export async function executePurge(
  record: PurgeRecord,
  executor: PurgeExecutor,
): Promise<PurgeRecord> {
  const now = new Date().toISOString();
  let result: Result<void>;

  switch (record.action) {
    case "delete":
      result = await executor.delete(record.category, record.recordId);
      break;
    case "archive":
      result = await executor.archive(record.category, record.recordId);
      break;
    case "anonymize":
      result = await executor.anonymize(record.category, record.recordId);
      break;
  }

  if (result.ok) {
    return {
      ...record,
      status: "completed",
      executedAt: now,
      errorMessage: null,
      updatedAt: now,
    };
  }

  const errMsg =
    result.error instanceof Error
      ? result.error.message
      : String(result.error);

  return {
    ...record,
    status: "failed",
    errorMessage: errMsg,
    updatedAt: now,
  };
}

/** Execute a batch of purge records, returning updated records with outcomes. */
export async function executePurgeBatch(
  records: ReadonlyArray<PurgeRecord>,
  executor: PurgeExecutor,
  concurrency = 5,
): Promise<ReadonlyArray<PurgeRecord>> {
  const results: PurgeRecord[] = [];
  const queue = [...records];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const settled = await Promise.all(batch.map((r) => executePurge(r, executor)));
    results.push(...settled);
  }

  return results;
}
