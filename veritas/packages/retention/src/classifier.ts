// Classifier: assigns retention policies to records based on their category and metadata.
import { z } from "zod";
import type { RetentionPolicy, RetentionCategory } from "./policy.js";

export const ClassifiableRecordSchema = z.object({
  id: z.string(),
  category: z.string(),
  createdAt: z.string(),
  /** Optional custom metadata used for policy matching. */
  metadata: z.record(z.unknown()).optional(),
});
export type ClassifiableRecord = z.infer<typeof ClassifiableRecordSchema>;

export interface ClassificationResult {
  readonly record: ClassifiableRecord;
  readonly policy: RetentionPolicy | null;
  /** ISO timestamp when the record expires, null if no policy or retentionDays=0. */
  readonly expiresAt: string | null;
  readonly reason: string;
}

/** Compute the expiry ISO timestamp for a record given a policy. */
function computeExpiry(createdAt: string, retentionDays: number): string | null {
  if (retentionDays === 0) return null;
  const base = new Date(createdAt);
  return new Date(base.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Classify a single record against an ordered list of policies.
 * The first enabled policy whose category matches is applied.
 */
export function classifyRecord(
  record: ClassifiableRecord,
  policies: ReadonlyArray<RetentionPolicy>,
): ClassificationResult {
  const match = policies.find(
    (p) => p.enabled && p.category === record.category,
  );

  if (!match) {
    return {
      record,
      policy: null,
      expiresAt: null,
      reason: `No enabled policy found for category '${record.category}'.`,
    };
  }

  const expiresAt = computeExpiry(record.createdAt, match.retentionDays);

  return {
    record,
    policy: match,
    expiresAt,
    reason:
      match.retentionDays === 0
        ? `Policy '${match.name}' retains records indefinitely.`
        : `Policy '${match.name}' retains records for ${match.retentionDays} days.`,
  };
}

/** Classify a batch of records, returning one ClassificationResult per record. */
export function classifyRecords(
  records: ReadonlyArray<ClassifiableRecord>,
  policies: ReadonlyArray<RetentionPolicy>,
): ReadonlyArray<ClassificationResult> {
  return records.map((r) => classifyRecord(r, policies));
}

/** Filter classification results to those whose expiry has passed. */
export function filterExpired(
  results: ReadonlyArray<ClassificationResult>,
  nowIso: string,
): ReadonlyArray<ClassificationResult> {
  return results.filter(
    (r) => r.expiresAt !== null && r.policy !== null && r.expiresAt <= nowIso,
  );
}

/** Group classification results by their assigned policy id. */
export function groupByPolicy(
  results: ReadonlyArray<ClassificationResult>,
): ReadonlyMap<string, ReadonlyArray<ClassificationResult>> {
  const map = new Map<string, ClassificationResult[]>();

  for (const result of results) {
    const key = result.policy?.id ?? "__unclassified__";
    const existing = map.get(key);
    if (existing) {
      existing.push(result);
    } else {
      map.set(key, [result]);
    }
  }

  return map;
}
