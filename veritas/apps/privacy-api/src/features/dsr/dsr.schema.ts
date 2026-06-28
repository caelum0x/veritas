// Zod schemas for DSR HTTP request/response validation.

import { z } from "zod";
import {
  DsrTypeSchema,
  DsrStatusSchema,
  DataSubjectSchema,
  VerificationMethodSchema,
} from "@veritas/gdpr";

export const CreateDsrBodySchema = z.object({
  type: DsrTypeSchema,
  subject: DataSubjectSchema,
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateDsrBody = z.infer<typeof CreateDsrBodySchema>;

export const InitiateVerificationBodySchema = z.object({
  subjectEmail: z.string().email(),
  method: VerificationMethodSchema,
});
export type InitiateVerificationBody = z.infer<typeof InitiateVerificationBodySchema>;

export const ConfirmVerificationBodySchema = z.object({
  tokenId: z.string().min(1),
  otp: z.string().min(4).max(12),
});
export type ConfirmVerificationBody = z.infer<typeof ConfirmVerificationBodySchema>;

export const UpdateDsrStatusBodySchema = z.object({
  status: DsrStatusSchema,
  rejectionReason: z.string().optional(),
});
export type UpdateDsrStatusBody = z.infer<typeof UpdateDsrStatusBodySchema>;

export const FulfillDsrBodySchema = z.object({
  tokenId: z.string().min(1),
  otp: z.string().min(4).max(12),
  type: DsrTypeSchema,
  subject: DataSubjectSchema,
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type FulfillDsrBody = z.infer<typeof FulfillDsrBodySchema>;

export const RunErasureBodySchema = z.object({
  dsrId: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
});
export type RunErasureBody = z.infer<typeof RunErasureBodySchema>;

export const DsrIdParamSchema = z.object({ id: z.string().min(1) });
export type DsrIdParam = z.infer<typeof DsrIdParamSchema>;

export const ListDsrQuerySchema = z.object({
  subjectId: z.string().min(1),
});
export type ListDsrQuery = z.infer<typeof ListDsrQuerySchema>;
