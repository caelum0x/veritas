// Partner agreement: legal contract binding a partner to Veritas terms of service.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

export type AgreementId = Id<"pagree">;

export function newAgreementId(): AgreementId {
  return newId("pagree");
}

export const AgreementStatusSchema = z.enum([
  "draft",
  "pending_signature",
  "signed",
  "expired",
  "terminated",
]);
export type AgreementStatus = z.infer<typeof AgreementStatusSchema>;

export const AgreementTypeSchema = z.enum([
  "standard",
  "enterprise",
  "reseller",
  "whitelabel",
]);
export type AgreementType = z.infer<typeof AgreementTypeSchema>;

export const PartnerAgreementSchema = z.object({
  id: z.string().startsWith("pagree_"),
  partnerId: z.string().startsWith("partner_"),
  type: AgreementTypeSchema,
  status: AgreementStatusSchema,
  version: z.string().min(1),
  contentHash: z.string().min(1),
  signedByUserId: z.string().startsWith("user_").nullable(),
  signedAt: z.string().datetime().nullable(),
  effectiveAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  terminatedAt: z.string().datetime().nullable(),
  terminationReason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PartnerAgreement = z.infer<typeof PartnerAgreementSchema>;

export const CreatePartnerAgreementSchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  type: AgreementTypeSchema,
  version: z.string().min(1),
  contentHash: z.string().min(1),
  effectiveAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePartnerAgreement = z.infer<typeof CreatePartnerAgreementSchema>;

export const SignAgreementSchema = z.object({
  signedByUserId: z.string().startsWith("user_"),
  signedAt: z.string().datetime(),
});
export type SignAgreement = z.infer<typeof SignAgreementSchema>;

export const TerminateAgreementSchema = z.object({
  terminatedAt: z.string().datetime(),
  terminationReason: z.string().min(1),
});
export type TerminateAgreement = z.infer<typeof TerminateAgreementSchema>;

export function makePartnerAgreement(
  input: CreatePartnerAgreement,
  now: string,
): PartnerAgreement {
  return {
    id: newAgreementId() as string,
    partnerId: input.partnerId,
    type: input.type,
    status: "draft",
    version: input.version,
    contentHash: input.contentHash,
    signedByUserId: null,
    signedAt: null,
    effectiveAt: input.effectiveAt ?? null,
    expiresAt: input.expiresAt ?? null,
    terminatedAt: null,
    terminationReason: null,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function signAgreement(
  agreement: PartnerAgreement,
  input: SignAgreement,
  now: string,
): PartnerAgreement {
  return {
    ...agreement,
    status: "signed",
    signedByUserId: input.signedByUserId,
    signedAt: input.signedAt,
    updatedAt: now,
  };
}

export function terminateAgreement(
  agreement: PartnerAgreement,
  input: TerminateAgreement,
  now: string,
): PartnerAgreement {
  return {
    ...agreement,
    status: "terminated",
    terminatedAt: input.terminatedAt,
    terminationReason: input.terminationReason,
    updatedAt: now,
  };
}

export function isAgreementActive(agreement: PartnerAgreement, now: string): boolean {
  if (agreement.status !== "signed") return false;
  if (agreement.expiresAt !== null && agreement.expiresAt <= now) return false;
  return true;
}
