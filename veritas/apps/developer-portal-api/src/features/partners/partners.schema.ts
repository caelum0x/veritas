// Zod schemas for partners feature request/response validation
import { z } from "zod";

export const CreatePartnerBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email(),
  websiteUrl: z.string().url().nullable().optional(),
  tierId: z.string().startsWith("ptier_"),
  organizationId: z.string().startsWith("org_"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePartnerBody = z.infer<typeof CreatePartnerBodySchema>;

export const UpdatePartnerBodySchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  status: z.enum(["pending", "active", "suspended", "terminated"]).optional(),
  tierId: z.string().startsWith("ptier_").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePartnerBody = z.infer<typeof UpdatePartnerBodySchema>;

export const GetPartnerParamsSchema = z.object({
  id: z.string().min(1),
});
export type GetPartnerParams = z.infer<typeof GetPartnerParamsSchema>;

export const CreateAgreementBodySchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  type: z.enum(["standard", "enterprise", "reseller", "whitelabel"]),
  version: z.string().min(1),
  contentHash: z.string().min(1),
  effectiveAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateAgreementBody = z.infer<typeof CreateAgreementBodySchema>;

export const SignAgreementBodySchema = z.object({
  signedByUserId: z.string().startsWith("user_"),
  signedAt: z.string().datetime(),
});
export type SignAgreementBody = z.infer<typeof SignAgreementBodySchema>;

export const TerminateAgreementBodySchema = z.object({
  terminatedAt: z.string().datetime(),
  terminationReason: z.string().min(1),
});
export type TerminateAgreementBody = z.infer<typeof TerminateAgreementBodySchema>;

export const CreateContactBodySchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  role: z.enum(["primary", "technical", "billing", "legal", "support"]),
  isPrimary: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;

export const UpdateContactBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["primary", "technical", "billing", "legal", "support"]).optional(),
  isPrimary: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateContactBody = z.infer<typeof UpdateContactBodySchema>;
