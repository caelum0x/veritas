// Maps @veritas/incident domain objects to HTTP response DTOs.
import type { Incident, TimelineEntry, Postmortem } from "@veritas/incident";
import type { IncidentMetrics, SloMetrics } from "@veritas/incident";

export interface IncidentDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: string;
  readonly status: string;
  readonly affectedServices: readonly string[];
  readonly responderIds: readonly string[];
  readonly labels: Record<string, string>;
  readonly detectedAt: string;
  readonly acknowledgedAt?: string;
  readonly mitigatedAt?: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TimelineEntryDto {
  readonly id: string;
  readonly incidentId: string;
  readonly actorId: string;
  readonly kind: string;
  readonly message: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: string;
}

export interface PostmortemDto {
  readonly id: string;
  readonly incidentId: string;
  readonly summary: string;
  readonly timeline: string;
  readonly rootCause: string;
  readonly impact: string;
  readonly actionItems: ReadonlyArray<{
    readonly id: string;
    readonly description: string;
    readonly ownerId: string;
    readonly dueDate?: string;
    readonly completed: boolean;
  }>;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map an Incident domain entity to HTTP DTO. */
export function mapIncident(incident: Incident): IncidentDto {
  return {
    id: incident.id,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    affectedServices: incident.affectedServices,
    responderIds: incident.responderIds,
    labels: incident.labels,
    detectedAt: incident.detectedAt,
    ...(incident.acknowledgedAt !== undefined ? { acknowledgedAt: incident.acknowledgedAt } : {}),
    ...(incident.mitigatedAt !== undefined ? { mitigatedAt: incident.mitigatedAt } : {}),
    ...(incident.resolvedAt !== undefined ? { resolvedAt: incident.resolvedAt } : {}),
    ...(incident.closedAt !== undefined ? { closedAt: incident.closedAt } : {}),
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  };
}

/** Map a TimelineEntry domain entity to HTTP DTO. */
export function mapTimelineEntry(entry: TimelineEntry): TimelineEntryDto {
  return {
    id: entry.id,
    incidentId: entry.incidentId,
    actorId: entry.actorId,
    kind: entry.kind,
    message: entry.message,
    metadata: entry.metadata,
    occurredAt: entry.occurredAt,
  };
}

/** Map a Postmortem domain entity to HTTP DTO. */
export function mapPostmortem(pm: Postmortem): PostmortemDto {
  return {
    id: pm.id,
    incidentId: pm.incidentId,
    summary: pm.summary,
    timeline: pm.timeline,
    rootCause: pm.rootCause,
    impact: pm.impact,
    actionItems: pm.actionItems.map((ai) => ({
      id: ai.id,
      description: ai.description,
      ownerId: ai.ownerId,
      ...(ai.dueDate !== undefined ? { dueDate: ai.dueDate } : {}),
      completed: ai.completed,
    })),
    createdBy: pm.createdBy,
    createdAt: pm.createdAt,
    updatedAt: pm.updatedAt,
  };
}

/** Pass-through for metrics (already plain objects). */
export function mapMetrics(metrics: IncidentMetrics): IncidentMetrics {
  return metrics;
}

/** Pass-through for SLO metrics. */
export function mapSloMetrics(metrics: SloMetrics): SloMetrics {
  return metrics;
}
