// Zod schemas for the incidents feature request/response validation.
import { z } from "zod";
import {
  SeveritySchema,
  IncidentStatusSchema,
  CreateIncidentSchema,
  UpdateIncidentSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
  IncidentListFilterSchema,
} from "@veritas/incident";

export {
  SeveritySchema,
  IncidentStatusSchema,
  CreateIncidentSchema,
  UpdateIncidentSchema,
  CreateTimelineEntrySchema,
  CreatePostmortemSchema,
  IncidentListFilterSchema,
};

export const TransitionStatusBodySchema = z.object({
  status: IncidentStatusSchema,
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
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  responderId: z.string().optional(),
  affectedService: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonneg().default(0),
});

export const MetricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  severity: SeveritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  targetMttrMs: z.coerce.number().int().positive().default(3_600_000),
});
