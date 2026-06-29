// AuditLog entity: an immutable record of a security-relevant action.

import { z } from "zod";
import { idSchema, timestampSchema, metadataSchema } from "./common.js";

export const AuditActorTypeSchema = z.enum([
  "USER",
  "AGENT",
  "API_KEY",
  "SYSTEM",
]);
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

export const AuditLogSchema = z.object({
  id: idSchema("aud"),
  organizationId: idSchema("org").nullable(),
  actorType: AuditActorTypeSchema,
  actorId: z.string().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: metadataSchema.optional(),
  occurredAt: timestampSchema,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const CreateAuditLogSchema = AuditLogSchema.omit({
  id: true,
  occurredAt: true,
});
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
