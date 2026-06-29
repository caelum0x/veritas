// Maps @veritas/incident domain objects to HTTP response shapes for the incidents feature.
import type { IncidentMetrics, SloMetrics } from "@veritas/incident";

/**
 * Structural type matching the Incident returned by IncidentService (from @veritas/incident types.ts).
 * Defined locally to avoid the ambiguous re-export conflict between incident.ts and types.ts.
 */
interface IncidentData {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: string;
  readonly status: string;
  readonly affectedServices?: readonly string[];
  readonly responderIds?: readonly string[];
  readonly labels?: Record<string, string>;
  readonly detectedAt: string;
  readonly acknowledgedAt?: string;
  readonly mitigatedAt?: string;
  readonly resolvedAt?: string;
  readonly closedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface TimelineEntryData {
  readonly id: string;
  readonly incidentId: string;
  readonly actorId: string;
  readonly kind: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt: string;
}

interface ActionItemData {
  readonly id: string;
  readonly description: string;
  readonly ownerId?: string | null;
  readonly dueDate?: string | null;
  readonly completed?: boolean;
  readonly completedAt?: string | null;
}

interface PostmortemData {
  readonly id: string;
  readonly incidentId: string;
  readonly summary: string;
  readonly timeline?: string;
  readonly rootCause?: string;
  readonly impact?: string;
  readonly actionItems: readonly ActionItemData[];
  readonly createdBy?: string;
  readonly authorId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

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

export function toIncidentResponse(incident: IncidentData): IncidentResponse {
  return Object.freeze({
    id: incident.id,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: incident.status,
    affectedServices: Object.freeze([...(incident.affectedServices ?? [])]),
    responderIds: Object.freeze([...(incident.responderIds ?? [])]),
    labels: Object.freeze({ ...(incident.labels ?? {}) }),
    detectedAt: incident.detectedAt,
    acknowledgedAt: incident.acknowledgedAt,
    mitigatedAt: incident.mitigatedAt,
    resolvedAt: incident.resolvedAt,
    closedAt: incident.closedAt,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  });
}

export function toTimelineEntryResponse(entry: TimelineEntryData): TimelineEntryResponse {
  return Object.freeze({
    id: entry.id,
    incidentId: entry.incidentId,
    actorId: entry.actorId,
    kind: entry.kind,
    message: entry.message,
    metadata: Object.freeze({ ...(entry.metadata ?? {}) }),
    occurredAt: entry.occurredAt,
  });
}

export function toPostmortemResponse(pm: PostmortemData): PostmortemResponse {
  return Object.freeze({
    id: pm.id,
    incidentId: pm.incidentId,
    summary: pm.summary,
    timeline: pm.timeline ?? "",
    rootCause: pm.rootCause ?? "",
    impact: pm.impact ?? "",
    actionItems: Object.freeze(
      pm.actionItems.map((ai) =>
        Object.freeze({
          id: ai.id,
          description: ai.description,
          ownerId: ai.ownerId ?? "",
          dueDate: ai.dueDate ?? undefined,
          completed: ai.completed ?? (ai.completedAt !== null && ai.completedAt !== undefined),
        }),
      ),
    ),
    createdBy: pm.createdBy ?? pm.authorId ?? "",
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
