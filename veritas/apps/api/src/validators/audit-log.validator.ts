// Zod validators for audit-log request bodies and query params.
import { z } from "zod";
import { AuditActorTypeSchema, CreateAuditLogSchema } from "@veritas/contracts";

export const createAuditLogBodySchema = CreateAuditLogSchema;

export const listAuditLogsQuerySchema = z.object({
  orgId: z.string().optional(),
  actorId: z.string().optional(),
  actorType: AuditActorTypeSchema.optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  fromTimestamp: z.string().datetime().optional(),
  toTimestamp: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
});

export const auditLogIdParamSchema = z.object({
  id: z.string().min(1),
});

export const summarizeQuerySchema = z.object({
  orgId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  actorId: z.string().optional(),
});

export type CreateAuditLogBody = z.infer<typeof createAuditLogBodySchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type AuditLogIdParam = z.infer<typeof auditLogIdParamSchema>;
export type SummarizeQuery = z.infer<typeof summarizeQuerySchema>;
