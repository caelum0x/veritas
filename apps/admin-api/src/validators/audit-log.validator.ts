// Zod validators for audit-log admin endpoints
import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().optional(),
  actorType: z.enum(["user", "agent", "system", "api_key"]).optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  organizationId: z.string().optional(),
  tenantId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const getAuditLogParamsSchema = z.object({
  auditLogId: z.string().min(1),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type GetAuditLogParams = z.infer<typeof getAuditLogParamsSchema>;
