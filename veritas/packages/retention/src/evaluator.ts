// Evaluates whether individual records have exceeded their retention period.
import { RetentionPolicy } from "./policy.js";
import { LegalHold, isUnderLegalHold } from "./legal-hold.js";
import { RecordRef, ExpiryEvaluation } from "./types.js";

/** Compute the ISO expiry timestamp for a record given a policy. */
function computeExpiresAt(record: RecordRef, policy: RetentionPolicy): string | null {
  if (policy.retentionDays === 0) return null; // keep forever
  const anchor = record.anchorAt ?? record.createdAt;
  const anchorMs = new Date(anchor).getTime();
  const expiryMs = anchorMs + policy.retentionDays * 86_400_000;
  return new Date(expiryMs).toISOString();
}

/** Evaluate a single record against its matched policy and active legal holds. */
export function evaluateRecord(
  record: RecordRef,
  policy: RetentionPolicy | null,
  holds: ReadonlyArray<LegalHold>,
  nowIso: string
): ExpiryEvaluation {
  const isOnHold = isUnderLegalHold(holds, record.category, record.id, nowIso);

  if (policy === null) {
    return {
      recordId: record.id,
      category: record.category,
      policyId: null,
      expiresAt: null,
      isExpired: false,
      isOnHold,
      action: null,
    };
  }

  const expiresAt = computeExpiresAt(record, policy);
  const isExpired = expiresAt !== null && expiresAt <= nowIso;

  return {
    recordId: record.id,
    category: record.category,
    policyId: policy.id,
    expiresAt,
    isExpired,
    isOnHold,
    action: policy.action,
  };
}

/** Evaluate multiple records, returning one ExpiryEvaluation per record. */
export function evaluateRecords(
  records: ReadonlyArray<RecordRef>,
  policyResolver: (category: string) => RetentionPolicy | null,
  holds: ReadonlyArray<LegalHold>,
  nowIso: string
): ReadonlyArray<ExpiryEvaluation> {
  return records.map((record) => {
    const policy = policyResolver(record.category);
    return evaluateRecord(record, policy, holds, nowIso);
  });
}

/** Filter evaluations to only those that are expired and not on hold. */
export function filterActionable(
  evaluations: ReadonlyArray<ExpiryEvaluation>
): ReadonlyArray<ExpiryEvaluation> {
  return evaluations.filter((e) => e.isExpired && !e.isOnHold && e.action !== null);
}

/** Group evaluations by their action type. */
export function groupByAction(
  evaluations: ReadonlyArray<ExpiryEvaluation>
): Readonly<Record<string, ReadonlyArray<ExpiryEvaluation>>> {
  const groups: Record<string, ExpiryEvaluation[]> = {};
  for (const evaluation of evaluations) {
    const key = evaluation.action ?? "none";
    const existing = groups[key] ?? [];
    groups[key] = [...existing, evaluation];
  }
  return groups;
}
