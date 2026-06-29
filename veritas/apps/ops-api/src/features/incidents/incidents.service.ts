// Incidents feature service — delegates all lifecycle operations to @veritas/incident IncidentService.
import { type Result } from "@veritas/core";
import {
  type IncidentListFilter,
  type IncidentMetrics,
  type SloMetrics,
  IncidentService,
} from "@veritas/incident";
import type {
  CreateIncidentBody,
  UpdateIncidentBody,
  AddTimelineEntryBody,
  CreatePostmortemBody,
  MetricsQuery,
} from "./incidents.schema.js";

/** Subset of Deps that the incidents feature requires. */
export interface IncidentsDeps {
  readonly incidentService: IncidentService;
}

export class IncidentsFeatureService {
  private readonly svc: IncidentService;

  constructor(deps: IncidentsDeps) {
    this.svc = deps.incidentService;
  }

  async list(
    filter: IncidentListFilter,
  ) {
    return this.svc.listIncidents(filter);
  }

  async create(body: CreateIncidentBody) {
    return this.svc.createIncident({
      title: body.title,
      description: body.description,
      severity: body.severity,
      affectedServices: body.affectedServices,
      labels: body.labels,
      detectedAt: body.detectedAt,
    });
  }

  async get(id: string) {
    return this.svc.getIncident(id);
  }

  async update(id: string, body: UpdateIncidentBody) {
    return this.svc.updateIncident(id, body);
  }

  async transition(
    id: string,
    status: string,
    actorId: string,
  ) {
    return this.svc.transitionStatus(
      id,
      status as Parameters<IncidentService["transitionStatus"]>[1],
      actorId,
    );
  }

  async assignResponder(
    incidentId: string,
    responderId: string,
    actorId: string,
  ) {
    return this.svc.assignResponder(incidentId, responderId, actorId);
  }

  async removeResponder(
    incidentId: string,
    responderId: string,
    actorId: string,
  ) {
    return this.svc.removeResponder(incidentId, responderId, actorId);
  }

  async addTimelineEntry(
    incidentId: string,
    body: AddTimelineEntryBody,
    actorId: string,
  ) {
    return this.svc.addTimelineEntry({
      incidentId,
      actorId,
      kind: body.kind,
      message: body.message,
      metadata: body.metadata,
      occurredAt: body.occurredAt,
    });
  }

  async getTimeline(incidentId: string) {
    return this.svc.getTimeline(incidentId);
  }

  async createPostmortem(
    incidentId: string,
    body: CreatePostmortemBody,
    actorId: string,
  ) {
    return this.svc.createPostmortem({
      incidentId,
      summary: body.summary,
      timeline: body.timeline,
      rootCause: body.rootCause,
      impact: body.impact,
      actionItems: body.actionItems,
      createdBy: actorId,
    });
  }

  async getPostmortem(incidentId: string) {
    return this.svc.getPostmortem(incidentId);
  }

  async getMetrics(query: MetricsQuery): Promise<Result<IncidentMetrics>> {
    return this.svc.getMetrics({
      from: query.from,
      to: query.to,
      severity: query.severity,
      status: query.status,
    });
  }

  async getSloMetrics(query: MetricsQuery): Promise<Result<SloMetrics>> {
    const targetMttrMs = query.targetMttrMs ?? 3_600_000; // default 1h
    return this.svc.getSloMetrics(
      { from: query.from, to: query.to },
      targetMttrMs,
    );
  }
}
