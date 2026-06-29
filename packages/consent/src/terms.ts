// Terms versions: tracks versioned terms-of-service and privacy policy documents.
import { z } from "zod";
import { newId, IsoTimestamp, contentHash } from "@veritas/core";

export type TermsId = string & { readonly __brand: "TermsId" };
export const newTermsId = (): TermsId => newId("terms") as unknown as TermsId;

export const TermsTypeSchema = z.enum(["privacy_policy", "terms_of_service", "data_processing"]);
export type TermsType = z.infer<typeof TermsTypeSchema>;

export const TermsVersionSchema = z.object({
  id: z.string(),
  type: TermsTypeSchema,
  version: z.string().min(1),
  contentHash: z.string(),
  content: z.string().min(1),
  effectiveAt: z.string(),
  supersededAt: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
});

export type TermsVersion = z.infer<typeof TermsVersionSchema>;

export const CreateTermsVersionSchema = z.object({
  type: TermsTypeSchema,
  version: z.string().min(1),
  content: z.string().min(1),
  effectiveAt: z.string(),
});

export type CreateTermsVersion = z.infer<typeof CreateTermsVersionSchema>;

export function makeTermsVersion(
  input: CreateTermsVersion,
  now: IsoTimestamp
): TermsVersion {
  return {
    id: newTermsId(),
    type: input.type,
    version: input.version,
    content: input.content,
    contentHash: contentHash(input.content),
    effectiveAt: input.effectiveAt,
    active: true,
    createdAt: now,
  };
}

export function supersede(
  terms: TermsVersion,
  now: IsoTimestamp
): TermsVersion {
  return { ...terms, active: false, supersededAt: now };
}
