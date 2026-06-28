// Zod request/response schemas for the incidents feature — all HTTP boundaries validated here.
import { z } from "zod";

export const SeveritySchema = z.enum(["SEV1", "SEV2", "SEV3", "SEV4", "SEV5"]);

export const IncidentStatusSchema = z.enum([
  "DETECTED",
  "TRIAGED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "MITIGATED",
  "RESOLVED",
  "CLOSED",
]);

export const CreateIncidentBodySchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().default(""),
  severity: SeveritySchema,
  affectedServices: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
  detectedAt: z.string().datetime({ offset: true }).optional(),
});

export type CreateIncidentBody = z.infer<typeof CreateIncidentBodySchema>;

export const UpdateIncidentBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: SeveritySchema.optional(),
  affectedServices: z.array(z.string()).optional(),
  labels: z.record(z.string()).optional(),
});

export type UpdateIncidentBody = z.infer<typeof UpdateIncidentBodySchema>;

export const TransitionStatusBodySchema = z.object({
  status: IncidentStatusSchema,
});

export type TransitionStatusBody = z.infer<typeof TransitionStatusBodySchema>;

export const AddTimelineEntryBodySchema = z.object({
  kind: z.enum(["STATUS_CHANGE", "NOTE", "ACTION", "DETECTION", "ALERT"]),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

export type AddTimelineEntryBody = z.infer<typeof AddTimelineEntryBodySchema>;

export const CreatePostmortemBodySchema = z.object({
  summary: z.string().min(1),
  timeline: z.string().default(""),
  rootCause: z.string().default(""),
  impact: z.string().default(""),
  actionItems: z
    .array(
      z.object({
        description: z.string().min(1),
        ownerId: z.string().min(1),
        dueDate: z.string().datetime({ offset: true }).optional(),
      }),
    )
    .default([]),
});

export type CreatePostmortemBody = z.infer<typeof CreatePostmortemBodySchema>;

export const ListIncidentsQuerySchema = z.object({
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  responderId: z.string().optional(),
  affectedService: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;

export const MetricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  severity: SeveritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  targetMttrMs: z.coerce.number().int().positive().optional(),
});

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
