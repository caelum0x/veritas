// Consent record: captures a user's consent decision for a processing purpose.
import { z } from "zod";
import { newId, UserId, IsoTimestamp } from "@veritas/core";

export type ConsentId = string & { readonly __brand: "ConsentId" };
export const newConsentId = (): ConsentId => newId("consent") as unknown as ConsentId;

export const ConsentStatusSchema = z.enum(["granted", "denied", "withdrawn"]);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const ConsentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  purposeId: z.string(),
  termsVersion: z.string(),
  status: ConsentStatusSchema,
  grantedAt: z.string().optional(),
  withdrawnAt: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Consent = z.infer<typeof ConsentSchema>;

export const CreateConsentSchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().min(1),
  termsVersion: z.string().min(1),
  status: ConsentStatusSchema,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type CreateConsent = z.infer<typeof CreateConsentSchema>;

export function makeConsent(
  input: CreateConsent,
  now: IsoTimestamp
): Consent {
  const id = newConsentId();
  return {
    id,
    userId: input.userId,
    purposeId: input.purposeId,
    termsVersion: input.termsVersion,
    status: input.status,
    grantedAt: input.status === "granted" ? now : undefined,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    createdAt: now,
    updatedAt: now,
  };
}
