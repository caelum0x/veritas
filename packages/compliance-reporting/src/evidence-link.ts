// Evidence link: associates a SOC2 evidence artifact with a compliance requirement.

import { z } from "zod";
import { type IsoTimestamp, ok, err, type Result, isoTimestampSchema } from "@veritas/core";
import {
  EvidenceLinkStatusSchema,
  type EvidenceLinkStatus,
  asEvidenceLinkId,
  type EvidenceLinkId,
} from "./types.js";
import { EvidenceLinkNotFoundError, EvidenceLinkConflictError } from "./errors.js";

// --- Schemas ---

export const EvidenceLinkSchema = z.object({
  id: z.string().min(1),
  /** ID of the requirement or control this evidence satisfies. */
  requirementId: z.string().min(1),
  /** Source evidence ID from @veritas/soc2 or any evidence store. */
  evidenceId: z.string().min(1),
  /** Human-readable rationale for the link. */
  rationale: z.string().min(1),
  status: EvidenceLinkStatusSchema,
  /** ISO timestamp when this link expires (optional). */
  expiresAt: isoTimestampSchema.optional(),
  linkedBy: z.string().min(1),
  linkedAt: isoTimestampSchema,
  supersededBy: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

export const CreateEvidenceLinkSchema = z.object({
  requirementId: z.string().min(1),
  evidenceId: z.string().min(1),
  rationale: z.string().min(1),
  expiresAt: isoTimestampSchema.optional(),
  linkedBy: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateEvidenceLink = z.infer<typeof CreateEvidenceLinkSchema>;

export const SupersedeEvidenceLinkSchema = z.object({
  newEvidenceId: z.string().min(1),
  rationale: z.string().min(1),
  linkedBy: z.string().min(1),
  expiresAt: isoTimestampSchema.optional(),
});
export type SupersedeEvidenceLink = z.infer<typeof SupersedeEvidenceLinkSchema>;

// --- Pure helpers ---

/** Check whether an evidence link is still active at the given timestamp. */
export function isLinkActive(link: EvidenceLink, asOf: IsoTimestamp): boolean {
  if (link.status !== "active") return false;
  if (link.expiresAt && link.expiresAt <= asOf) return false;
  return true;
}

/** Build an EvidenceLink from create input. */
function buildLink(
  input: CreateEvidenceLink,
  linkedAt: IsoTimestamp,
  idGenerator: () => string,
): EvidenceLink {
  return {
    id: asEvidenceLinkId(idGenerator()),
    requirementId: input.requirementId,
    evidenceId: input.evidenceId,
    rationale: input.rationale,
    status: "active",
    expiresAt: input.expiresAt,
    linkedBy: input.linkedBy,
    linkedAt,
    metadata: input.metadata,
  };
}

// --- In-memory store ---

export class EvidenceLinkStore {
  private readonly store = new Map<string, EvidenceLink>();

  /** Create a new evidence link; returns conflict error if duplicate active link exists. */
  create(
    input: CreateEvidenceLink,
    linkedAt: IsoTimestamp,
    idGenerator: () => string = () => crypto.randomUUID(),
  ): Result<EvidenceLink, EvidenceLinkConflictError> {
    const duplicate = [...this.store.values()].find(
      (l) =>
        l.requirementId === input.requirementId &&
        l.evidenceId === input.evidenceId &&
        l.status === "active",
    );
    if (duplicate) {
      return err(new EvidenceLinkConflictError(input.requirementId, input.evidenceId));
    }
    const link = buildLink(input, linkedAt, idGenerator);
    this.store.set(link.id, link);
    return ok(link);
  }

  findById(id: EvidenceLinkId | string): Result<EvidenceLink, EvidenceLinkNotFoundError> {
    const found = this.store.get(id);
    if (!found) return err(new EvidenceLinkNotFoundError(id));
    return ok(found);
  }

  /** Mark an existing link as superseded and create the replacement. */
  supersede(
    existingId: EvidenceLinkId | string,
    input: SupersedeEvidenceLink,
    linkedAt: IsoTimestamp,
    idGenerator: () => string = () => crypto.randomUUID(),
  ): Result<EvidenceLink, EvidenceLinkNotFoundError> {
    const existing = this.store.get(existingId);
    if (!existing) return err(new EvidenceLinkNotFoundError(existingId));
    const newLink = buildLink(
      {
        requirementId: existing.requirementId,
        evidenceId: input.newEvidenceId,
        rationale: input.rationale,
        expiresAt: input.expiresAt,
        linkedBy: input.linkedBy,
      },
      linkedAt,
      idGenerator,
    );
    this.store.set(newLink.id, newLink);
    const updated: EvidenceLink = { ...existing, status: "superseded", supersededBy: newLink.id };
    this.store.set(existingId, updated);
    return ok(newLink);
  }

  /** Revoke an evidence link by id. */
  revoke(id: EvidenceLinkId | string): Result<EvidenceLink, EvidenceLinkNotFoundError> {
    const existing = this.store.get(id);
    if (!existing) return err(new EvidenceLinkNotFoundError(id));
    const updated: EvidenceLink = { ...existing, status: "revoked" };
    this.store.set(id, updated);
    return ok(updated);
  }

  /** Return all active links for a requirement. */
  activeForRequirement(requirementId: string, asOf: IsoTimestamp): EvidenceLink[] {
    return [...this.store.values()].filter(
      (l) => l.requirementId === requirementId && isLinkActive(l, asOf),
    );
  }

  /** Return all links (any status) for a given evidence artifact. */
  allForEvidence(evidenceId: string): EvidenceLink[] {
    return [...this.store.values()].filter((l) => l.evidenceId === evidenceId);
  }
}
