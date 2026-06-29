// In-memory incident store — port interface with concrete in-memory implementation.
import { Result, ok, err } from "@veritas/core";
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
  PostmortemNotFoundError,
  DuplicatePostmortemError,
  TimelineEntryNotFoundError,
} from "./errors.js";

export interface IncidentStore {
  createIncident(data: Incident): Promise<Result<Incident>>;
  getIncident(id: string): Promise<Result<Incident>>;
  updateIncident(
    id: string,
    patch: Partial<Incident>,
  ): Promise<Result<Incident>>;
  listIncidents(
    filter: IncidentListFilter,
  ): Promise<Result<{ items: Incident[]; total: number }>>;
  deleteIncident(id: string): Promise<Result<void>>;

  addTimelineEntry(entry: TimelineEntry): Promise<Result<TimelineEntry>>;
  getTimelineEntry(
    id: string,
  ): Promise<Result<TimelineEntry>>;
  listTimelineEntries(
    incidentId: string,
  ): Promise<Result<TimelineEntry[]>>;

  createPostmortem(pm: Postmortem): Promise<Result<Postmortem>>;
  getPostmortemByIncident(
    incidentId: string,
  ): Promise<Result<Postmortem>>;
  updatePostmortem(
    id: string,
    patch: Partial<Postmortem>,
  ): Promise<Result<Postmortem>>;
}

export class InMemoryIncidentStore implements IncidentStore {
  private readonly incidents = new Map<string, Incident>();
  private readonly timeline = new Map<string, TimelineEntry>();
  private readonly postmortems = new Map<string, Postmortem>();
  private readonly postmortemByIncident = new Map<string, string>();

  async createIncident(data: Incident): Promise<Result<Incident>> {
    this.incidents.set(data.id, data);
    return ok(data);
  }

  async getIncident(id: string): Promise<Result<Incident>> {
    const incident = this.incidents.get(id);
    if (!incident) return err(new IncidentNotFoundError(id));
    return ok(incident);
  }

  async updateIncident(
    id: string,
    patch: Partial<Incident>,
  ): Promise<Result<Incident>> {
    const existing = this.incidents.get(id);
    if (!existing) return err(new IncidentNotFoundError(id));
    const updated: Incident = { ...existing, ...patch };
    this.incidents.set(id, updated);
    return ok(updated);
  }

  async listIncidents(
    filter: IncidentListFilter,
  ): Promise<Result<{ items: Incident[]; total: number }>> {
    let items = Array.from(this.incidents.values());

    if (filter.status) items = items.filter((i) => i.status === filter.status);
    if (filter.severity)
      items = items.filter((i) => i.severity === filter.severity);
    if (filter.responderId)
      items = items.filter((i) => i.responderIds.includes(filter.responderId!));
    if (filter.affectedService)
      items = items.filter((i) =>
        i.affectedServices.includes(filter.affectedService!),
      );
    if (filter.from)
      items = items.filter((i) => i.detectedAt >= filter.from!);
    if (filter.to) items = items.filter((i) => i.detectedAt <= filter.to!);

    items.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    const total = items.length;
    const sliced = items.slice(filter.offset, filter.offset + filter.limit);
    return ok({ items: sliced, total });
  }

  async deleteIncident(id: string): Promise<Result<void>> {
    if (!this.incidents.has(id)) return err(new IncidentNotFoundError(id));
    this.incidents.delete(id);
    return ok(undefined);
  }

  async addTimelineEntry(
    entry: TimelineEntry,
  ): Promise<Result<TimelineEntry>> {
    this.timeline.set(entry.id, entry);
    return ok(entry);
  }

  async getTimelineEntry(id: string): Promise<Result<TimelineEntry>> {
    const entry = this.timeline.get(id);
    if (!entry) return err(new TimelineEntryNotFoundError(id));
    return ok(entry);
  }

  async listTimelineEntries(
    incidentId: string,
  ): Promise<Result<TimelineEntry[]>> {
    const entries = Array.from(this.timeline.values())
      .filter((e) => e.incidentId === incidentId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    return ok(entries);
  }

  async createPostmortem(pm: Postmortem): Promise<Result<Postmortem>> {
    if (this.postmortemByIncident.has(pm.incidentId)) {
      return err(new DuplicatePostmortemError(pm.incidentId));
    }
    this.postmortems.set(pm.id, pm);
    this.postmortemByIncident.set(pm.incidentId, pm.id);
    return ok(pm);
  }

  async getPostmortemByIncident(
    incidentId: string,
  ): Promise<Result<Postmortem>> {
    const pmId = this.postmortemByIncident.get(incidentId);
    if (!pmId) return err(new PostmortemNotFoundError(incidentId));
    const pm = this.postmortems.get(pmId)!;
    return ok(pm);
  }

  async updatePostmortem(
    id: string,
    patch: Partial<Postmortem>,
  ): Promise<Result<Postmortem>> {
    const existing = this.postmortems.get(id);
    if (!existing) return err(new PostmortemNotFoundError(id));
    const updated: Postmortem = { ...existing, ...patch };
    this.postmortems.set(id, updated);
    return ok(updated);
  }
}
