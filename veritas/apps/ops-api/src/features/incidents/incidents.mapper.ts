// Maps @veritas/incident domain objects to HTTP response shapes for the incidents feature.
import type {
  Incident,
  TimelineEntry,
  Postmortem,
} from "@veritas/incident";
import type { IncidentMetrics, SloMetrics } from "@veritas/incident";

export interface IncidentResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: string;
  readonly status: string;
  readonly affectedServices: readonly string[];
  readonly responderIds: readonly string[];
  readonly labels: Readonly<Record<string, string>>;
  readonly detectedAt: string;
  readonly acknowledgedAt?: string;
  readonly mitigatedAt?: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TimelineEntryResponse {
  readonly id: string;
  readonly incidentId: string;
  readonly actorId: string;
  readonly kind: string;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

export interface PostmortemResponse {
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

export function toIncidentResponse(incident: Incident): IncidentResponse {
  return Object.freeze({
    id: incident.id,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    affectedServices: Object.freeze([...incident.affectedServices]),
    responderIds: Object.freeze([...incident.responderIds]),
    labels: Object.freeze({ ...incident.labels }),
    detectedAt: incident.detectedAt,
    acknowledgedAt: incident.acknowledgedAt,
    mitigatedAt: incident.mitigatedAt,
    resolvedAt: incident.resolvedAt,
    closedAt: incident.closedAt,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  });
}

export function toTimelineEntryResponse(entry: TimelineEntry): TimelineEntryResponse {
  return Object.freeze({
    id: entry.id,
    incidentId: entry.incidentId,
    actorId: entry.actorId,
    kind: entry.kind,
    message: entry.message,
    metadata: Object.freeze({ ...entry.metadata }),
    occurredAt: entry.occurredAt,
  });
}

export function toPostmortemResponse(pm: Postmortem): PostmortemResponse {
  return Object.freeze({
    id: pm.id,
    incidentId: pm.incidentId,
    summary: pm.summary,
    timeline: pm.timeline,
    rootCause: pm.rootCause,
    impact: pm.impact,
    actionItems: Object.freeze(
      pm.actionItems.map((ai) =>
        Object.freeze({
          id: ai.id,
          description: ai.description,
          ownerId: ai.ownerId,
          dueDate: ai.dueDate,
          completed: ai.completed,
        }),
      ),
    ),
    createdBy: pm.createdBy,
    createdAt: pm.createdAt,
    updatedAt: pm.updatedAt,
  });
}

export function toMetricsResponse(metrics: IncidentMetrics): IncidentMetrics {
  return Object.freeze({ ...metrics });
}

export function toSloMetricsResponse(metrics: SloMetrics): SloMetrics {
  return Object.freeze({ ...metrics });
}
