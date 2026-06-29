// User agreement: links a user to accepted terms versions and their consent decisions.
import { z } from "zod";
import { newId, IsoTimestamp } from "@veritas/core";

export type AgreementId = string & { readonly __brand: "AgreementId" };
export const newAgreementId = (): AgreementId => newId("agreement") as unknown as AgreementId;

export const AgreementStatusSchema = z.enum(["active", "superseded", "revoked"]);
export type AgreementStatus = z.infer<typeof AgreementStatusSchema>;

export const AgreementSchema = z.object({
  id: z.string(),
  userId: z.string().min(1),
  termsId: z.string().min(1),
  termsVersion: z.string().min(1),
  consentIds: z.array(z.string()),
  status: AgreementStatusSchema,
  signedAt: z.string(),
  revokedAt: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Agreement = z.infer<typeof AgreementSchema>;

export const CreateAgreementSchema = z.object({
  userId: z.string().min(1),
  termsId: z.string().min(1),
  termsVersion: z.string().min(1),
  consentIds: z.array(z.string()).default([]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type CreateAgreement = z.infer<typeof CreateAgreementSchema>;

export function makeAgreement(
  input: CreateAgreement,
  now: IsoTimestamp
): Agreement {
  return {
    id: newAgreementId(),
    userId: input.userId,
    termsId: input.termsId,
    termsVersion: input.termsVersion,
    consentIds: input.consentIds,
    status: "active",
    signedAt: now,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdAt: now,
    updatedAt: now,
  };
}

export function revokeAgreement(
  agreement: Agreement,
  now: IsoTimestamp
): Agreement {
  return {
    ...agreement,
    status: "revoked",
    revokedAt: now,
    updatedAt: now,
  };
}

export function supersedeAgreement(
  agreement: Agreement,
  now: IsoTimestamp
): Agreement {
  return {
    ...agreement,
    status: "superseded",
    updatedAt: now,
  };
}
