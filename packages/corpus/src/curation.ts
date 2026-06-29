// Corpus curation: review and approval workflows for corpus records.

import { z } from "zod";
import { type Result, ok, err, ValidationError, type IsoTimestamp, epochToIso } from "@veritas/core";
import { type CorpusRecord } from "./record.js";

export const CurationDecisionSchema = z.object({
  recordId: z.string().min(1),
  action: z.enum(["approve", "reject", "flag", "update", "promote", "demote"]),
  reason: z.string().nullable(),
  curatedBy: z.string().min(1),
  authorityWeightOverride: z.number().min(0).max(1).optional(),
  qualityScoreOverride: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export type CurationDecision = z.infer<typeof CurationDecisionSchema>;

export interface CurationResult {
  readonly original: CorpusRecord;
  readonly updated: CorpusRecord;
  readonly decision: CurationDecision;
  readonly decidedAt: IsoTimestamp;
}

export interface CurationReviewQueue {
  readonly pending: readonly CorpusRecord[];
  readonly flagged: readonly CorpusRecord[];
}

export function buildReviewQueue(
  records: readonly CorpusRecord[],
): CurationReviewQueue {
  const pending = records.filter((r) => r.curatedBy === null);
  const flagged = records.filter(
    (r) => r.tags.includes("flagged") && r.curatedBy !== null,
  );
  return { pending, flagged };
}

export function applyCurationDecision(
  record: CorpusRecord,
  decision: CurationDecision,
): Result<CurationResult> {
  const parsed = CurationDecisionSchema.safeParse(decision);
  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid curation decision",
        details: { issues: parsed.error.issues },
      }),
    );
  }

  if (parsed.data.recordId !== record.id) {
    return err(
      new ValidationError({
        message: "Decision recordId does not match record",
        details: { recordId: parsed.data.recordId, expected: record.id },
      }),
    );
  }

  const decidedAt = epochToIso(Date.now());
  const d = parsed.data;

  const baseTags = record.tags.filter((t) => t !== "flagged" && t !== "approved" && t !== "rejected");
  const actionTags: string[] =
    d.action === "approve"
      ? ["approved"]
      : d.action === "reject"
        ? ["rejected"]
        : d.action === "flag"
          ? ["flagged"]
          : [];

  const mergedTags = [...new Set([...baseTags, ...actionTags, ...(d.tags ?? [])])];

  const updated: CorpusRecord = {
    ...record,
    authorityWeight:
      d.authorityWeightOverride !== undefined
        ? (d.authorityWeightOverride as CorpusRecord["authorityWeight"])
        : record.authorityWeight,
    qualityScore:
      d.qualityScoreOverride !== undefined
        ? (d.qualityScoreOverride as CorpusRecord["qualityScore"])
        : record.qualityScore,
    tags: mergedTags,
    notes: d.notes !== undefined ? (d.notes ?? null) : record.notes,
    curatedBy: d.curatedBy,
    curatedAt: decidedAt,
    updatedAt: decidedAt,
  };

  return ok({ original: record, updated, decision: parsed.data, decidedAt });
}

export function isApproved(record: CorpusRecord): boolean {
  return record.tags.includes("approved");
}

export function isRejected(record: CorpusRecord): boolean {
  return record.tags.includes("rejected");
}

export function isFlagged(record: CorpusRecord): boolean {
  return record.tags.includes("flagged");
}
