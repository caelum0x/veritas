// Retention audit log: immutable record of every retention policy action and hold event.
import { z } from "zod";
import { newId } from "@veritas/core";
import { RetentionActionSchema, RetentionCategorySchema } from "./policy.js";

export const RetentionAuditEventTypeSchema = z.enum([
  "policy_created",
  "policy_updated",
  "policy_deleted",
  "hold_placed",
  "hold_released",
  "hold_expired",
  "record_purged",
  "record_archived",
  "record_anonymized",
  "record_skipped",
  "purge_run_started",
  "purge_run_completed",
]);
export type RetentionAuditEventType = z.infer<typeof RetentionAuditEventTypeSchema>;

export const RetentionAuditEntrySchema = z.object({
  id: z.string(),
  eventType: RetentionAuditEventTypeSchema,
  /** The actor (user id, system, scheduler) who triggered the event. */
  actor: z.string().min(1),
  /** Affected record id, if applicable. */
  recordId: z.string().nullable().default(null),
  /** Category of the affected record, if applicable. */
  category: RetentionCategorySchema.nullable().default(null),
  /** Policy id involved, if applicable. */
  policyId: z.string().nullable().default(null),
  /** Legal hold id involved, if applicable. */
  holdId: z.string().nullable().default(null),
  /** Action that was or would have been taken. */
  action: RetentionActionSchema.nullable().default(null),
  /** Human-readable note about the event. */
  note: z.string().default(""),
  /** Arbitrary structured details. */
  details: z.record(z.unknown()).default({}),
  occurredAt: z.string(),
});
export type RetentionAuditEntry = z.infer<typeof RetentionAuditEntrySchema>;

export type CreateRetentionAuditEntry = Omit<RetentionAuditEntry, "id" | "occurredAt"> & {
  occurredAt?: string;
};

/** Construct an immutable audit entry with a generated id and timestamp. */
export function makeAuditEntry(dto: CreateRetentionAuditEntry): RetentionAuditEntry {
  return RetentionAuditEntrySchema.parse({
    ...dto,
    id: newId("ret-audit"),
    occurredAt: dto.occurredAt ?? new Date().toISOString(),
  });
}

/** In-memory append-only audit log for the retention module. */
export interface RetentionAuditLog {
  /** Append a new entry. Returns the stored entry. */
  append(dto: CreateRetentionAuditEntry): RetentionAuditEntry;
  /** Return all entries, newest first. */
  listAll(): ReadonlyArray<RetentionAuditEntry>;
  /** Return entries for a specific record id. */
  listForRecord(recordId: string): ReadonlyArray<RetentionAuditEntry>;
  /** Return entries matching a specific event type. */
  listByEventType(eventType: RetentionAuditEventType): ReadonlyArray<RetentionAuditEntry>;
  /** Return entries in a time range [fromIso, toIso). */
  listInRange(fromIso: string, toIso: string): ReadonlyArray<RetentionAuditEntry>;
}

/** Creates an in-memory append-only retention audit log. */
export function createRetentionAuditLog(): RetentionAuditLog {
  const entries: RetentionAuditEntry[] = [];

  const append = (dto: CreateRetentionAuditEntry): RetentionAuditEntry => {
    const entry = makeAuditEntry(dto);
    entries.unshift(entry); // newest first
    return entry;
  };

  const listAll = (): ReadonlyArray<RetentionAuditEntry> => [...entries];

  const listForRecord = (recordId: string): ReadonlyArray<RetentionAuditEntry> =>
    entries.filter((e) => e.recordId === recordId);

  const listByEventType = (
    eventType: RetentionAuditEventType
  ): ReadonlyArray<RetentionAuditEntry> =>
    entries.filter((e) => e.eventType === eventType);

  const listInRange = (
    fromIso: string,
    toIso: string
  ): ReadonlyArray<RetentionAuditEntry> =>
    entries.filter((e) => e.occurredAt >= fromIso && e.occurredAt < toIso);

  return { append, listAll, listForRecord, listByEventType, listInRange };
}
