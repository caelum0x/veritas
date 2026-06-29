// Evidence collector: gathers and normalises evidence artifacts for SOC2 controls.

import { z } from "zod";
import { type IsoTimestamp, type Result, ok, err, isoTimestampSchema } from "@veritas/core";
import { type Control } from "./control.js";

export const EvidenceTypeSchema = z.enum([
  "screenshot",
  "log_export",
  "configuration_snapshot",
  "report",
  "policy_document",
  "test_result",
  "interview_note",
  "system_generated",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const CollectedEvidenceSchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  type: EvidenceTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  contentHash: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  collectedAt: isoTimestampSchema,
  collectedBy: z.string().min(1),
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
});
export type CollectedEvidence = z.infer<typeof CollectedEvidenceSchema>;

export const CollectionRequestSchema = z.object({
  controlId: z.string().min(1),
  type: EvidenceTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  contentHash: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  collectedBy: z.string().min(1),
  periodStart: isoTimestampSchema,
  periodEnd: isoTimestampSchema,
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CollectionRequest = z.infer<typeof CollectionRequestSchema>;

export const CollectionResultSchema = z.object({
  evidenceId: z.string().min(1),
  controlId: z.string().min(1),
  collectedAt: isoTimestampSchema,
  warnings: z.array(z.string()).default([]),
});
export type CollectionResult = z.infer<typeof CollectionResultSchema>;

/** Port interface for storage backends used by the collector. */
export interface EvidenceStore {
  save(evidence: CollectedEvidence): Promise<Result<CollectedEvidence>>;
  findByControlId(controlId: string): Promise<Result<CollectedEvidence[]>>;
  findById(id: string): Promise<Result<CollectedEvidence | null>>;
}

/** In-memory evidence store for testing / local development. */
export class InMemoryEvidenceStore implements EvidenceStore {
  private readonly store = new Map<string, CollectedEvidence>();

  async save(evidence: CollectedEvidence): Promise<Result<CollectedEvidence>> {
    const next = Object.freeze({ ...evidence });
    this.store.set(next.id, next);
    return ok(next);
  }

  async findByControlId(
    controlId: string,
  ): Promise<Result<CollectedEvidence[]>> {
    const results = [...this.store.values()].filter(
      (e) => e.controlId === controlId,
    );
    return ok(results);
  }

  async findById(id: string): Promise<Result<CollectedEvidence | null>> {
    return ok(this.store.get(id) ?? null);
  }
}

/** Validate that a collection request is consistent with the target control. */
export function validateCollectionRequest(
  request: CollectionRequest,
  control: Control,
): Result<CollectionRequest, string> {
  if (control.status !== "active") {
    return err(
      `Control ${control.code} is not active (status: ${control.status})`,
    );
  }
  if (request.periodStart >= request.periodEnd) {
    return err("periodStart must be before periodEnd");
  }
  return ok(request);
}

/** Build a CollectedEvidence from a validated request and a generated id/timestamp. */
export function buildEvidence(
  id: string,
  request: CollectionRequest,
  now: IsoTimestamp,
): CollectedEvidence {
  return Object.freeze({
    id,
    controlId: request.controlId,
    type: request.type,
    title: request.title,
    description: request.description,
    source: request.source,
    contentHash: request.contentHash,
    sizeBytes: request.sizeBytes,
    mimeType: request.mimeType,
    collectedAt: now,
    collectedBy: request.collectedBy,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    tags: [...(request.tags ?? [])],
    metadata: request.metadata,
    createdAt: now,
  });
}
