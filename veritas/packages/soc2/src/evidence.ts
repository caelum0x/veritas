// Control evidence: artifacts that demonstrate a control is operating effectively.

import { z } from "zod";
import { type IsoTimestamp, type ContentHash, isoTimestampSchema, contentHashSchema } from "@veritas/core";

export const EvidenceTypeSchema = z.enum([
  "screenshot",
  "log_export",
  "policy_document",
  "configuration_export",
  "access_review",
  "vulnerability_scan",
  "penetration_test",
  "interview_notes",
  "system_generated",
  "third_party_report",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceStatusSchema = z.enum([
  "pending",
  "collected",
  "reviewed",
  "accepted",
  "rejected",
  "expired",
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

export const EvidenceSourceSchema = z.enum([
  "manual",
  "automated",
  "third_party",
  "auditor",
]);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const EvidenceCollectorSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  source: EvidenceSourceSchema,
});
export type EvidenceCollector = z.infer<typeof EvidenceCollectorSchema>;

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: EvidenceTypeSchema,
  status: EvidenceStatusSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  collector: EvidenceCollectorSchema,
  /** Period this evidence covers: ISO date range. */
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  /** SHA-256 hash of the evidence artifact. */
  contentHash: contentHashSchema.optional(),
  storageUri: z.string().url().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: isoTimestampSchema.optional(),
  rejectionReason: z.string().optional(),
  expiresAt: isoTimestampSchema.optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const CreateEvidenceSchema = EvidenceSchema.omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateEvidence = z.infer<typeof CreateEvidenceSchema>;

export const ReviewEvidenceSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  reviewedBy: z.string().min(1),
  rejectionReason: z.string().optional(),
});
export type ReviewEvidence = z.infer<typeof ReviewEvidenceSchema>;

export const EvidenceSummarySchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: EvidenceTypeSchema,
  status: EvidenceStatusSchema,
  title: z.string().min(1),
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  createdAt: isoTimestampSchema,
});
export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>;

/** Check whether evidence is still within its validity window. */
export function isEvidenceValid(evidence: Evidence, asOf: IsoTimestamp): boolean {
  if (evidence.status !== "accepted") return false;
  if (!evidence.expiresAt) return true;
  return evidence.expiresAt >= asOf;
}

/** Build a lightweight summary from a full evidence record. */
export function toEvidenceSummary(evidence: Evidence): EvidenceSummary {
  return {
    id: evidence.id,
    controlId: evidence.controlId,
    type: evidence.type,
    status: evidence.status,
    title: evidence.title,
    periodStart: evidence.periodStart,
    periodEnd: evidence.periodEnd,
    createdAt: evidence.createdAt,
  };
}

/** Return only accepted evidence items from a collection. */
export function filterAcceptedEvidence(items: readonly Evidence[]): Evidence[] {
  return items.filter((e) => e.status === "accepted");
}
