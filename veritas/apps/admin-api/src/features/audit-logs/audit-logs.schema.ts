// Zod schemas for audit-logs feature HTTP request validation.
import { z } from "zod";
import { CreateAuditLogSchema, AuditActorTypeSchema } from "@veritas/contracts";
import { ExportFormatSchema } from "@veritas/audit-export";

export const AppendAuditLogBodySchema = CreateAuditLogSchema;
export type AppendAuditLogBody = z.infer<typeof AppendAuditLogBodySchema>;

export const AuditLogIdParamSchema = z.object({
  auditLogId: z.string().min(1),
});
export type AuditLogIdParam = z.infer<typeof AuditLogIdParamSchema>;

export const ListAuditLogsQuerySchema = z.object({
  orgId: z.string().optional(),
  actorId: z.string().optional(),
  actorType: AuditActorTypeSchema.optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  fromTimestamp: z.string().datetime().optional(),
  toTimestamp: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

export const SummarizeQuerySchema = z.object({
  orgId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  actorId: z.string().optional(),
});
export type SummarizeQuery = z.infer<typeof SummarizeQuerySchema>;

export const ExportAuditLogsBodySchema = z.object({
  format: ExportFormatSchema.default("JSON_LINES"),
  orgId: z.string().optional(),
  actorIds: z.array(z.string()).optional(),
  resourceTypes: z.array(z.string()).optional(),
  fromTimestamp: z.string().datetime().optional(),
  toTimestamp: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(10_000).optional(),
});
export type ExportAuditLogsBody = z.infer<typeof ExportAuditLogsBodySchema>;
