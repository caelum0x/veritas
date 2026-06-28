// Shared type definitions for the incident management module.
import { z } from "zod";

export const SeveritySchema = z.enum(["SEV1", "SEV2", "SEV3", "SEV4", "SEV5"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const IncidentStatusSchema = z.enum([
  "DETECTED",
  "TRIAGED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "MITIGATED",
  "RESOLVED",
  "CLOSED",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  severity: SeveritySchema,
  status: IncidentStatusSchema,
  affectedServices: z.array(z.string()),
  responderIds: z.array(z.string()),
  labels: z.record(z.string()),
  detectedAt: z.string(),
  acknowledgedAt: z.string().optional(),
  mitigatedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  closedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Incident = z.infer<typeof IncidentSchema>;

export const CreateIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  severity: SeveritySchema,
  affectedServices: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
  detectedAt: z.string().optional(),
});
export type CreateIncident = z.infer<typeof CreateIncidentSchema>;

export const UpdateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
  affectedServices: z.array(z.string()).optional(),
  labels: z.record(z.string()).optional(),
});
export type UpdateIncident = z.infer<typeof UpdateIncidentSchema>;

export const TimelineEntrySchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  actorId: z.string(),
  kind: z.enum(["STATUS_CHANGE", "NOTE", "ACTION", "DETECTION", "ALERT"]),
  message: z.string(),
  metadata: z.record(z.unknown()).default({}),
  occurredAt: z.string(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const CreateTimelineEntrySchema = z.object({
  incidentId: z.string(),
  actorId: z.string(),
  kind: TimelineEntrySchema.shape.kind,
  message: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  occurredAt: z.string().optional(),
});
export type CreateTimelineEntry = z.infer<typeof CreateTimelineEntrySchema>;

export const PostmortemSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  summary: z.string(),
  timeline: z.string(),
  rootCause: z.string(),
  impact: z.string(),
  actionItems: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      ownerId: z.string(),
      dueDate: z.string().optional(),
      completed: z.boolean().default(false),
    }),
  ),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Postmortem = z.infer<typeof PostmortemSchema>;

export const CreatePostmortemSchema = z.object({
  incidentId: z.string(),
  summary: z.string().min(1),
  timeline: z.string().default(""),
  rootCause: z.string().default(""),
  impact: z.string().default(""),
  actionItems: z
    .array(
      z.object({
        description: z.string(),
        ownerId: z.string(),
        dueDate: z.string().optional(),
      }),
    )
    .default([]),
  createdBy: z.string(),
});
export type CreatePostmortem = z.infer<typeof CreatePostmortemSchema>;

export const IncidentListFilterSchema = z.object({
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  responderId: z.string().optional(),
  affectedService: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().default(0),
});
export type IncidentListFilter = z.infer<typeof IncidentListFilterSchema>;
