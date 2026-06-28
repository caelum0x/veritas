// Zod schemas for consent HTTP request/response validation.

import { z } from "zod";
import { CreateConsentSchema, ConsentStatusSchema, ConsentChannelSchema } from "@veritas/consent";

export const GrantConsentBodySchema = CreateConsentSchema.extend({
  channel: ConsentChannelSchema.optional(),
  sessionId: z.string().optional(),
  locale: z.string().optional(),
});
export type GrantConsentBody = z.infer<typeof GrantConsentBodySchema>;

export const DenyConsentBodySchema = CreateConsentSchema.extend({
  channel: ConsentChannelSchema.optional(),
});
export type DenyConsentBody = z.infer<typeof DenyConsentBodySchema>;

export const WithdrawConsentBodySchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().min(1),
  reason: z.enum(["user_request", "account_deletion", "legal_hold", "expired", "admin_revoke"]).optional(),
});
export type WithdrawConsentBody = z.infer<typeof WithdrawConsentBodySchema>;

export const ListConsentQuerySchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().optional(),
  status: ConsentStatusSchema.optional(),
});
export type ListConsentQuery = z.infer<typeof ListConsentQuerySchema>;

export const CheckConsentQuerySchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().min(1),
});
export type CheckConsentQuery = z.infer<typeof CheckConsentQuerySchema>;

export const CaptureConsentBodySchema = z.object({
  userId: z.string().min(1),
  purposeId: z.string().min(1),
  termsVersion: z.string().min(1),
  status: ConsentStatusSchema,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  channel: ConsentChannelSchema.optional(),
  sessionId: z.string().optional(),
});
export type CaptureConsentBody = z.infer<typeof CaptureConsentBodySchema>;
