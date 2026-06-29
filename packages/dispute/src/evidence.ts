// Dispute evidence: structured proof submitted by parties during dispute review.

import { z } from "zod";
import { newId, type Id, type UserId, epochToIso, type IsoTimestamp } from "@veritas/core";
import type { DisputeId } from "./dispute.js";

export type DisputeEvidenceId = Id<"devi">;
export const newDisputeEvidenceId = (): DisputeEvidenceId => newId("devi");

export const EvidenceKind = {
  DOCUMENT: "DOCUMENT",
  URL: "URL",
  TEXT: "TEXT",
  DATA: "DATA",
} as const;
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];

export const EvidenceKindSchema = z.enum(["DOCUMENT", "URL", "TEXT", "DATA"]);

export const DisputeEvidenceSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  submittedById: z.string(),
  kind: EvidenceKindSchema,
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50_000),
  mimeType: z.string().nullable(),
  url: z.string().url().nullable(),
  hash: z.string().nullable(),
  submittedAt: z.string(),
  metadata: z.record(z.unknown()).default({}),
});

export type DisputeEvidence = z.infer<typeof DisputeEvidenceSchema>;

export interface CreateEvidenceInput {
  readonly disputeId: DisputeId;
  readonly submittedById: UserId;
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly content: string;
  readonly mimeType?: string | null;
  readonly url?: string | null;
  readonly hash?: string | null;
  readonly metadata?: Record<string, unknown>;
}

/** Construct a new DisputeEvidence record (immutable). */
export function createEvidence(input: CreateEvidenceInput): DisputeEvidence {
  const now: IsoTimestamp = epochToIso(Date.now());
  return {
    id: newDisputeEvidenceId(),
    disputeId: input.disputeId,
    submittedById: input.submittedById,
    kind: input.kind,
    title: input.title,
    content: input.content,
    mimeType: input.mimeType ?? null,
    url: input.url ?? null,
    hash: input.hash ?? null,
    submittedAt: now,
    metadata: input.metadata ?? {},
  };
}

/** Validate that the evidence content length is within bounds. */
export function validateEvidenceContent(content: string): boolean {
  return content.length > 0 && content.length <= 50_000;
}
