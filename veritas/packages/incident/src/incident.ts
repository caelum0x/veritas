// Core incident model: schema, types, and factory functions.
import { z } from "zod";
import { newId, IsoTimestamp, ContentHash } from "@veritas/core";
import { SeverityLevelSchema } from "./severity.js";

export const IncidentStatusSchema = z.enum([
  "DETECTED",
  "ACKNOWLEDGED",
  "INVESTIGATING",
  "MITIGATING",
  "RESOLVED",
  "CLOSED",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().max(4096).default(""),
  severity: SeverityLevelSchema,
  status: IncidentStatusSchema,
  serviceId: z.string().optional(),
  alertIds: z.array(z.string()).default([]),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  labels: z.record(z.string()).default({}),
  contentHash: z.string().optional(),
  detectedAt: z.string(),
  acknowledgedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  closedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Incident = z.infer<typeof IncidentSchema>;

export const CreateIncidentSchema = IncidentSchema.pick({
  title: true,
  severity: true,
  description: true,
  serviceId: true,
  alertIds: true,
  teamId: true,
  labels: true,
}).partial({ description: true, serviceId: true, alertIds: true, teamId: true, labels: true });

export type CreateIncident = z.infer<typeof CreateIncidentSchema>;

export const UpdateIncidentSchema = IncidentSchema.pick({
  title: true,
  description: true,
  severity: true,
  assigneeId: true,
  teamId: true,
  labels: true,
}).partial();

export type UpdateIncident = z.infer<typeof UpdateIncidentSchema>;

export function makeIncident(input: CreateIncident, now: IsoTimestamp): Incident {
  return IncidentSchema.parse({
    id: newId("incident"),
    title: input.title,
    description: input.description ?? "",
    severity: input.severity,
    status: "DETECTED" as IncidentStatus,
    serviceId: input.serviceId,
    alertIds: input.alertIds ?? [],
    teamId: input.teamId,
    labels: input.labels ?? {},
    detectedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateIncident(incident: Incident, patch: UpdateIncident, now: IsoTimestamp): Incident {
  return IncidentSchema.parse({
    ...incident,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    updatedAt: now,
  });
}

export function withStatus(incident: Incident, status: IncidentStatus, now: IsoTimestamp): Incident {
  const timestamps: Partial<Incident> = {};
  if (status === "ACKNOWLEDGED") timestamps.acknowledgedAt = now;
  if (status === "RESOLVED") timestamps.resolvedAt = now;
  if (status === "CLOSED") timestamps.closedAt = now;
  return { ...incident, ...timestamps, status, updatedAt: now };
}
