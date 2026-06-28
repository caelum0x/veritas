// Input/output DTOs for audit-log application service use-cases.
import { z } from "zod";
import {
  AuditLogSchema,
  CreateAuditLogSchema,
  AuditActorTypeSchema,
} from "@veritas/contracts";

/** Input DTO for appending an audit log entry. */
export const CreateAuditLogInputSchema = CreateAuditLogSchema;
export type CreateAuditLogInput = z.infer<typeof CreateAuditLogInputSchema>;

/** Query options for searching and listing audit log entries. */
export const ListAuditLogsInputSchema = z.object({
  orgId: z.string().optional(),
  actorId: z.string().optional(),
  actorType: AuditActorTypeSchema.optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  action: z.string().optional(),
  fromTimestamp: z.string().datetime().optional(),
  toTimestamp: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});
export type ListAuditLogsInput = z.infer<typeof ListAuditLogsInputSchema>;

/** Output DTO: a single audit log entry. */
export const AuditLogOutputSchema = AuditLogSchema;
export type AuditLogOutput = z.infer<typeof AuditLogOutputSchema>;

/** Output DTO: paginated list of audit log entries. */
export const AuditLogListOutputSchema = z.object({
  items: z.array(AuditLogSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type AuditLogListOutput = z.infer<typeof AuditLogListOutputSchema>;

/** Summary of audit activity for a resource or actor. */
export const AuditSummaryOutputSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  uniqueActors: z.number().int().nonnegative(),
  lastEventAt: z.string().datetime().nullable(),
  actionBreakdown: z.record(z.string(), z.number().int().nonnegative()),
});
export type AuditSummaryOutput = z.infer<typeof AuditSummaryOutputSchema>;

/** Factory to produce a canonical AuditLogOutput from a raw record. */
export function toAuditLogOutput(entry: AuditLogOutput): AuditLogOutput {
  return { ...entry };
}
