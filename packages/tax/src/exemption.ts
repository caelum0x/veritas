// Tax exemption management: creation, validation, and lookup of exemption records.

import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import { ExemptionTypeSchema, type ExemptionType } from "./types.js";
import { ExemptionNotFoundError, ExemptionExpiredError } from "./errors.js";

export const ExemptionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: ExemptionTypeSchema,
  jurisdictionCode: z.string().min(2).max(10),
  certificateNumber: z.string().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Exemption = z.infer<typeof ExemptionSchema>;

export const CreateExemptionInputSchema = z.object({
  organizationId: z.string().min(1),
  type: ExemptionTypeSchema,
  jurisdictionCode: z.string().min(2).max(10),
  certificateNumber: z.string().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type CreateExemptionInput = z.infer<typeof CreateExemptionInputSchema>;

/** Port interface for exemption persistence. */
export interface ExemptionRepository {
  findById(id: string): Promise<Exemption | null>;
  findByOrganization(organizationId: string): Promise<Exemption[]>;
  findActive(organizationId: string, jurisdictionCode: string): Promise<Exemption[]>;
  save(exemption: Exemption): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Checks whether an exemption is valid at a given point in time. */
export function isExemptionValid(exemption: Exemption, at: Date = new Date()): boolean {
  const validFrom = new Date(exemption.validFrom);
  if (at < validFrom) return false;
  if (exemption.validUntil != null) {
    const validUntil = new Date(exemption.validUntil);
    if (at > validUntil) return false;
  }
  return true;
}

/** Creates a new exemption record with a generated id and timestamps. */
export function createExemption(
  input: CreateExemptionInput,
  now: Date = new Date()
): Exemption {
  const iso = now.toISOString();
  return {
    id: newId("ex"),
    organizationId: input.organizationId,
    type: input.type,
    jurisdictionCode: input.jurisdictionCode,
    certificateNumber: input.certificateNumber,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    documentUrl: input.documentUrl,
    notes: input.notes,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Resolves the applicable exemption for a given org and jurisdiction, or returns an error. */
export async function resolveExemption(
  repo: ExemptionRepository,
  organizationId: string,
  jurisdictionCode: string,
  at: Date = new Date()
): Promise<Result<Exemption | null, ExemptionNotFoundError | ExemptionExpiredError>> {
  const active = await repo.findActive(organizationId, jurisdictionCode);
  if (active.length === 0) return ok(null);
  const valid = active.filter((e) => isExemptionValid(e, at));
  if (valid.length === 0) {
    const latest = active.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    return err(
      new ExemptionExpiredError(latest!.id, latest!.validUntil ?? latest!.updatedAt)
    );
  }
  return ok(valid[0]!);
}

/** Validates that a given exemption type is supported for a jurisdiction. */
export function isSupportedExemptionType(
  type: ExemptionType,
  jurisdictionCode: string
): boolean {
  // Withholding-tax-only jurisdictions do not support RESELLER exemptions.
  const withholdingOnly = new Set(["IN", "BR", "CN"]);
  if (withholdingOnly.has(jurisdictionCode) && type === "RESELLER") return false;
  return true;
}
