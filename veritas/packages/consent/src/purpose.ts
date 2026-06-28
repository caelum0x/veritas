// Processing purpose: defines why personal data is collected and how it is used.
import { z } from "zod";
import { newId, IsoTimestamp } from "@veritas/core";

export type PurposeId = string & { readonly __brand: "PurposeId" };
export const newPurposeId = (): PurposeId => newId("purpose") as unknown as PurposeId;

export const LegalBasisSchema = z.enum([
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
]);
export type LegalBasis = z.infer<typeof LegalBasisSchema>;

export const PurposeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  legalBasis: LegalBasisSchema,
  retentionDays: z.number().int().positive(),
  required: z.boolean(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Purpose = z.infer<typeof PurposeSchema>;

export const CreatePurposeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  legalBasis: LegalBasisSchema,
  retentionDays: z.number().int().positive(),
  required: z.boolean().default(false),
});

export type CreatePurpose = z.infer<typeof CreatePurposeSchema>;

export function makePurpose(
  input: CreatePurpose,
  now: IsoTimestamp
): Purpose {
  return {
    id: newPurposeId(),
    name: input.name,
    description: input.description,
    legalBasis: input.legalBasis,
    retentionDays: input.retentionDays,
    required: input.required,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function deactivatePurpose(
  purpose: Purpose,
  now: IsoTimestamp
): Purpose {
  return { ...purpose, active: false, updatedAt: now };
}
