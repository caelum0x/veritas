// Maps @veritas/incident domain objects to HTTP response DTOs.
import type { IncidentService } from "@veritas/incident";
import type { IncidentMetrics, SloMetrics } from "@veritas/incident";
import type { Result, Ok } from "@veritas/core";

// Derive the actual Incident type from what IncidentService.createIncident returns.
type ServiceIncident = Awaited<ReturnType<IncidentService["createIncident"]>> extends Result<infer T> ? T : never;
type ServicePostmortem = Awaited<ReturnType<IncidentService["createPostmortem"]>> extends Result<infer T> ? T : never;
type ServiceTimelineEntry = Awaited<ReturnType<IncidentService["addTimelineEntry"]>> extends Result<infer T> ? T : never;

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
export function mapIncident(incident: ServiceIncident): IncidentDto {
  const inc = incident as Record<string, unknown>;
  return {
    id: inc["id"] as string,
    title: inc["title"] as string,
    description: inc["description"] as string,
    severity: inc["severity"] as string,
    status: inc["status"] as string,
    affectedServices: Array.isArray(inc["affectedServices"]) ? (inc["affectedServices"] as string[]) : [],
    responderIds: Array.isArray(inc["responderIds"]) ? (inc["responderIds"] as string[]) : [],
    labels: (inc["labels"] as Record<string, string>) ?? {},
    detectedAt: inc["detectedAt"] as string,
    ...(inc["acknowledgedAt"] !== undefined ? { acknowledgedAt: inc["acknowledgedAt"] as string } : {}),
    ...(inc["mitigatedAt"] !== undefined ? { mitigatedAt: inc["mitigatedAt"] as string } : {}),
    ...(inc["resolvedAt"] !== undefined ? { resolvedAt: inc["resolvedAt"] as string } : {}),
    ...(inc["closedAt"] !== undefined ? { closedAt: inc["closedAt"] as string } : {}),
    createdAt: inc["createdAt"] as string,
    updatedAt: inc["updatedAt"] as string,
  };
}

/** Map a TimelineEntry domain entity to HTTP DTO. */
export function mapTimelineEntry(entry: ServiceTimelineEntry): TimelineEntryDto {
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
export function mapPostmortem(pm: ServicePostmortem): PostmortemDto {
  const p = pm as Record<string, unknown>;
  const actionItems = Array.isArray(p["actionItems"])
    ? (p["actionItems"] as Array<Record<string, unknown>>).map((ai) => ({
        id: ai["id"] as string,
        description: ai["description"] as string,
        ownerId: (ai["ownerId"] as string | null | undefined) ?? "",
        ...(ai["dueDate"] !== undefined && ai["dueDate"] !== null
          ? { dueDate: ai["dueDate"] as string }
          : {}),
        completed: ai["completed"] !== undefined
          ? Boolean(ai["completed"])
          : ai["completedAt"] !== null && ai["completedAt"] !== undefined,
      }))
    : [];

  return {
    id: p["id"] as string,
    incidentId: p["incidentId"] as string,
    summary: (p["summary"] as string | undefined) ?? "",
    timeline: (p["timeline"] as string | undefined) ?? "",
    rootCause: (p["rootCause"] as string | undefined) ??
      (Array.isArray(p["rootCauses"]) ? (p["rootCauses"] as string[]).join("\n") : ""),
    impact: (p["impact"] as string | undefined) ??
      (p["impactDescription"] as string | undefined) ?? "",
    actionItems,
    createdBy: (p["createdBy"] as string | undefined) ??
      (p["authorId"] as string | undefined) ?? "",
    createdAt: p["createdAt"] as string,
    updatedAt: p["updatedAt"] as string,
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
