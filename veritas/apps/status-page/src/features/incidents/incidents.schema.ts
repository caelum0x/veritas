// Zod schemas for the incidents feature request/response validation.
import { z } from "zod";
import type { IncidentService } from "@veritas/incident";
import {
  SeveritySchema,
  UpdateIncidentSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
  IncidentListFilterSchema,
} from "@veritas/incident";

export {
  SeveritySchema,
  UpdateIncidentSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
  IncidentListFilterSchema,
};

// Matches the types.ts CreateIncident that IncidentService.createIncident expects.
type _ServiceCreateIncident = Parameters<IncidentService["createIncident"]>[0];

export const CreateIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  severity: SeveritySchema,
  affectedServices: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
  detectedAt: z.string().optional(),
}) satisfies z.ZodType<_ServiceCreateIncident, z.ZodTypeDef, unknown>;

// Use status values matching @veritas/incident IncidentListFilter (from types.ts).
const ServiceIncidentStatusSchema = z.enum([
  "DETECTED",
  "TRIAGED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "MITIGATED",
  "RESOLVED",
  "CLOSED",
]);
export { ServiceIncidentStatusSchema as IncidentStatusSchema };

export const TransitionStatusBodySchema = z.object({
  status: ServiceIncidentStatusSchema,
  actorId: z.string().min(1),
});

export const AssignResponderBodySchema = z.object({
  responderId: z.string().min(1),
  actorId: z.string().min(1),
});

export const RemoveResponderParamsSchema = z.object({
  id: z.string().min(1),
  responderId: z.string().min(1),
});

export const IncidentIdParamsSchema = z.object({ id: z.string().min(1) });

export const ListIncidentsQuerySchema = z.object({
  status: ServiceIncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  responderId: z.string().optional(),
  affectedService: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const MetricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  severity: SeveritySchema.optional(),
  status: ServiceIncidentStatusSchema.optional(),
  targetMttrMs: z.coerce.number().int().positive().default(3_600_000),
});
