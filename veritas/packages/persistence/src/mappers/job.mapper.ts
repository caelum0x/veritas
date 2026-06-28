// Maps Job domain objects to/from persistence rows with immutable clone-on-write semantics.
import type { Job, CreateJob, UpdateJob } from "@veritas/contracts";
import { newId } from "@veritas/core";

/** Persistence row shape for a Job. */
export interface JobRow {
  readonly id: string;
  readonly verificationId: string | null;
  readonly status: string;
  readonly request: {
    readonly text: string;
    readonly options?: Record<string, unknown>;
  };
  readonly attempts: number;
  readonly error: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row into a Job domain object. */
export function rowToJob(row: JobRow): Job {
  return {
    id: row.id as Job["id"],
    verificationId: row.verificationId as Job["verificationId"],
    status: row.status as Job["status"],
    request: { ...row.request } as Job["request"],
    attempts: row.attempts,
    error: row.error,
    startedAt: row.startedAt as Job["startedAt"],
    finishedAt: row.finishedAt as Job["finishedAt"],
    ...(row.metadata !== undefined ? { metadata: { ...row.metadata } } : {}),
    createdAt: row.createdAt as Job["createdAt"],
    updatedAt: row.updatedAt as Job["updatedAt"],
  } as Job;
}

/** Convert a CreateJob DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateJob, now: string): JobRow {
  const id = newId("job");
  return {
    id,
    verificationId: null,
    status: "PENDING",
    request: { ...dto.request } as JobRow["request"],
    attempts: 0,
    error: null,
    startedAt: null,
    finishedAt: null,
    ...(dto.metadata !== undefined ? { metadata: { ...dto.metadata } } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with an UpdateJob patch, returning a new row. */
export function mergeRow(existing: JobRow, patch: UpdateJob, now: string): JobRow {
  return {
    ...existing,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.verificationId !== undefined ? { verificationId: patch.verificationId } : {}),
    ...(patch.error !== undefined ? { error: patch.error } : {}),
    ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
    ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
    updatedAt: now,
  };
}
