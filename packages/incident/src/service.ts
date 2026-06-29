// Incident service — orchestrates lifecycle, timeline, postmortems, and metrics.
import { Result, ok, err, isErr } from "@veritas/core";
import { newId } from "@veritas/core";
import type {
  Incident,
  CreateIncident,
  UpdateIncident,
  TimelineEntry,
  CreateTimelineEntry,
  Postmortem,
  CreatePostmortem,
  IncidentListFilter,
} from "./types.js";
import {
  IncidentNotFoundError,
  InvalidStatusTransitionError,
  IncidentAlreadyClosedError,
} from "./errors.js";
import type { IncidentStore } from "./store.js";
import type { IncidentStatus } from "./types.js";
import { computeMetrics, computeSloMetrics } from "./metrics.js";
import type { IncidentMetrics, SloMetrics } from "./metrics.js";

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  DETECTED: ["TRIAGED", "ACKNOWLEDGED"],
  TRIAGED: ["ACKNOWLEDGED", "INVESTIGATING"],
  ACKNOWLEDGED: ["INVESTIGATING"],
  INVESTIGATING: ["MITIGATED", "RESOLVED"],
  MITIGATED: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

function now(): string {
  return new Date().toISOString();
}

export class IncidentService {
  constructor(private readonly store: IncidentStore) {}

  async createIncident(
    data: CreateIncident,
  ): Promise<Result<Incident>> {
    const ts = now();
    const incident: Incident = {
      id: newId("incident"),
      title: data.title,
      description: data.description ?? "",
      severity: data.severity,
      status: "DETECTED",
      affectedServices: data.affectedServices ?? [],
      responderIds: [],
      labels: data.labels ?? {},
      detectedAt: data.detectedAt ?? ts,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.store.createIncident(incident);
  }

  async getIncident(id: string): Promise<Result<Incident>> {
    return this.store.getIncident(id);
  }

  async updateIncident(
    id: string,
    patch: UpdateIncident,
  ): Promise<Result<Incident>> {
    const existing = await this.store.getIncident(id);
    if (isErr(existing)) return existing;
    if (existing.value.status === "CLOSED") {
      return err(new IncidentAlreadyClosedError(id));
    }
    return this.store.updateIncident(id, { ...patch, updatedAt: now() });
  }

  async transitionStatus(
    id: string,
    nextStatus: IncidentStatus,
    actorId: string,
  ): Promise<Result<Incident>> {
    const result = await this.store.getIncident(id);
    if (isErr(result)) return result;

    const incident = result.value;
    const allowed = ALLOWED_TRANSITIONS[incident.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      return err(
        new InvalidStatusTransitionError(incident.status, nextStatus),
      );
    }

    const ts = now();
    const timestamps: Partial<Incident> = { status: nextStatus, updatedAt: ts };
    if (nextStatus === "ACKNOWLEDGED") timestamps.acknowledgedAt = ts;
    if (nextStatus === "MITIGATED") timestamps.mitigatedAt = ts;
    if (nextStatus === "RESOLVED") timestamps.resolvedAt = ts;
    if (nextStatus === "CLOSED") timestamps.closedAt = ts;

    const updated = await this.store.updateIncident(id, timestamps);
    if (isErr(updated)) return updated;

    await this.addTimelineEntry({
      incidentId: id,
      actorId,
      kind: "STATUS_CHANGE",
      message: `Status changed from ${incident.status} to ${nextStatus}`,
      metadata: { from: incident.status, to: nextStatus },
    });

    return updated;
  }

  async assignResponder(
    id: string,
    responderId: string,
    actorId: string,
  ): Promise<Result<Incident>> {
    const result = await this.store.getIncident(id);
    if (isErr(result)) return result;

    const incident = result.value;
    if (incident.status === "CLOSED") {
      return err(new IncidentAlreadyClosedError(id));
    }

    if (incident.responderIds.includes(responderId)) return ok(incident);

    const updated = await this.store.updateIncident(id, {
      responderIds: [...incident.responderIds, responderId],
      updatedAt: now(),
    });

    if (isErr(updated)) return updated;

    await this.addTimelineEntry({
      incidentId: id,
      actorId,
      kind: "ACTION",
      message: `Responder ${responderId} assigned`,
      metadata: { responderId },
    });

    return updated;
  }

  async removeResponder(
    id: string,
    responderId: string,
    actorId: string,
  ): Promise<Result<Incident>> {
    const result = await this.store.getIncident(id);
    if (isErr(result)) return result;

    const incident = result.value;
    const updated = await this.store.updateIncident(id, {
      responderIds: incident.responderIds.filter((r) => r !== responderId),
      updatedAt: now(),
    });

    if (isErr(updated)) return updated;

    await this.addTimelineEntry({
      incidentId: id,
      actorId,
      kind: "ACTION",
      message: `Responder ${responderId} removed`,
      metadata: { responderId },
    });

    return updated;
  }

  async listIncidents(
    filter: IncidentListFilter,
  ): Promise<Result<{ items: Incident[]; total: number }>> {
    return this.store.listIncidents(filter);
  }

  async addTimelineEntry(
    data: CreateTimelineEntry,
  ): Promise<Result<TimelineEntry>> {
    const entry: TimelineEntry = {
      id: newId("tl"),
      incidentId: data.incidentId,
      actorId: data.actorId,
      kind: data.kind,
      message: data.message,
      metadata: data.metadata ?? {},
      occurredAt: data.occurredAt ?? now(),
    };
    return this.store.addTimelineEntry(entry);
  }

  async getTimeline(
    incidentId: string,
  ): Promise<Result<TimelineEntry[]>> {
    const incident = await this.store.getIncident(incidentId);
    if (isErr(incident)) return incident;
    return this.store.listTimelineEntries(incidentId);
  }

  async createPostmortem(
    data: CreatePostmortem,
  ): Promise<Result<Postmortem>> {
    const incidentResult = await this.store.getIncident(data.incidentId);
    if (isErr(incidentResult)) return incidentResult;

    const ts = now();
    const pm: Postmortem = {
      id: newId("pm"),
      incidentId: data.incidentId,
      summary: data.summary,
      timeline: data.timeline ?? "",
      rootCause: data.rootCause ?? "",
      impact: data.impact ?? "",
      actionItems: (data.actionItems ?? []).map((ai) => ({
        id: newId("ai"),
        description: ai.description,
        ownerId: ai.ownerId,
        dueDate: ai.dueDate,
        completed: false,
      })),
      createdBy: data.createdBy,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.store.createPostmortem(pm);
  }

  async getPostmortem(incidentId: string): Promise<Result<Postmortem>> {
    return this.store.getPostmortemByIncident(incidentId);
  }

  async updatePostmortem(
    incidentId: string,
    patch: Partial<Omit<Postmortem, "id" | "incidentId" | "createdBy" | "createdAt">>,
  ): Promise<Result<Postmortem>> {
    const pmResult = await this.store.getPostmortemByIncident(incidentId);
    if (isErr(pmResult)) return pmResult;
    return this.store.updatePostmortem(pmResult.value.id, {
      ...patch,
      updatedAt: now(),
    });
  }

  async getMetrics(
    filter: Pick<IncidentListFilter, "from" | "to" | "severity" | "status">,
  ): Promise<Result<IncidentMetrics>> {
    const listResult = await this.store.listIncidents({
      ...filter,
      limit: 10000,
      offset: 0,
    });
    if (isErr(listResult)) return listResult;
    return ok(computeMetrics(listResult.value.items));
  }

  async getSloMetrics(
    filter: Pick<IncidentListFilter, "from" | "to">,
    targetMttrMs: number,
  ): Promise<Result<SloMetrics>> {
    const listResult = await this.store.listIncidents({
      ...filter,
      limit: 10000,
      offset: 0,
    });
    if (isErr(listResult)) return listResult;
    return ok(computeSloMetrics(listResult.value.items, targetMttrMs));
  }
}
