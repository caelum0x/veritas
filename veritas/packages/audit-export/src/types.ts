// Core types for audit export: audit events, export formats, severity levels, and actor records.

import { z } from "zod";

export const AuditSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const AuditCategorySchema = z.enum([
  "AUTH",
  "DATA_ACCESS",
  "DATA_MUTATION",
  "ADMIN",
  "POLICY",
  "COMPLIANCE",
  "EXPORT",
  "SECURITY",
]);
export type AuditCategory = z.infer<typeof AuditCategorySchema>;

export const ExportFormatSchema = z.enum(["JSON_LINES", "CEF", "SYSLOG"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const AuditActorSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "service", "system"]),
  email: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});
export type AuditActor = z.infer<typeof AuditActorSchema>;

export const AuditResourceSchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
  orgId: z.string().optional(),
});
export type AuditResource = z.infer<typeof AuditResourceSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  action: z.string(),
  category: AuditCategorySchema,
  severity: AuditSeveritySchema,
  actor: AuditActorSchema,
  resource: AuditResourceSchema,
  outcome: z.enum(["SUCCESS", "FAILURE", "PARTIAL"]),
  detail: z.record(z.unknown()).optional(),
  previousHash: z.string().optional(),
  hash: z.string().optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const ExportFilterSchema = z.object({
  fromTimestamp: z.string().datetime().optional(),
  toTimestamp: z.string().datetime().optional(),
  categories: z.array(AuditCategorySchema).optional(),
  severities: z.array(AuditSeveritySchema).optional(),
  actorIds: z.array(z.string()).optional(),
  resourceTypes: z.array(z.string()).optional(),
  outcomes: z.array(z.enum(["SUCCESS", "FAILURE", "PARTIAL"])).optional(),
  orgId: z.string().optional(),
});
export type ExportFilter = z.infer<typeof ExportFilterSchema>;

export const ExportConfigSchema = z.object({
  format: ExportFormatSchema,
  filter: ExportFilterSchema.optional(),
  batchSize: z.number().int().positive().default(100),
  includeHash: z.boolean().default(true),
  destination: z.string().optional(),
});
export type ExportConfig = z.infer<typeof ExportConfigSchema>;

export interface ExportResult {
  readonly recordsExported: number;
  readonly bytesWritten: number;
  readonly format: ExportFormat;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly errors: readonly string[];
}

export interface ChainedEvent {
  readonly event: AuditEvent;
  readonly chainHash: string;
  readonly sequenceNumber: number;
}

export const SiemConfigSchema = z.object({
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});
export type SiemConfig = z.infer<typeof SiemConfigSchema>;
