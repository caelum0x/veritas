// Public incident feed: in-memory store of active and recent resolved incidents.
import { z } from "zod";
import { newId } from "@veritas/core";

export const PublicIncidentSeveritySchema = z.enum(["critical", "major", "minor", "maintenance"]);
export type PublicIncidentSeverity = z.infer<typeof PublicIncidentSeveritySchema>;

export const PublicIncidentStatusSchema = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);
export type PublicIncidentStatus = z.infer<typeof PublicIncidentStatusSchema>;

export const IncidentUpdateSchema = z.object({
  id: z.string(),
  body: z.string().min(1),
  status: PublicIncidentStatusSchema,
  createdAt: z.string(),
});
export type IncidentUpdate = z.infer<typeof IncidentUpdateSchema>;

export const PublicIncidentSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  severity: PublicIncidentSeveritySchema,
  status: PublicIncidentStatusSchema,
  affectedComponentIds: z.array(z.string()),
  updates: z.array(IncidentUpdateSchema),
  startedAt: z.string(),
  resolvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PublicIncident = z.infer<typeof PublicIncidentSchema>;

export const CreatePublicIncidentSchema = PublicIncidentSchema.omit({
  id: true,
  updates: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePublicIncident = z.infer<typeof CreatePublicIncidentSchema>;

/** Port interface for incident persistence. */
export interface IncidentFeedStore {
  list(limit: number): Promise<readonly PublicIncident[]>;
  active(): Promise<readonly PublicIncident[]>;
  get(id: string): Promise<PublicIncident | undefined>;
  create(input: CreatePublicIncident, now: string): Promise<PublicIncident>;
  addUpdate(
    id: string,
    body: string,
    status: PublicIncidentStatus,
    now: string,
  ): Promise<PublicIncident | undefined>;
}

/** In-memory implementation of IncidentFeedStore. */
export class InMemoryIncidentFeedStore implements IncidentFeedStore {
  private readonly store = new Map<string, PublicIncident>();

  async list(limit: number): Promise<readonly PublicIncident[]> {
    return [...this.store.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async active(): Promise<readonly PublicIncident[]> {
    return [...this.store.values()].filter((i) => i.status !== "resolved");
  }

  async get(id: string): Promise<PublicIncident | undefined> {
    return this.store.get(id);
  }

  async create(input: CreatePublicIncident, now: string): Promise<PublicIncident> {
    const incident: PublicIncident = Object.freeze({
      ...input,
      id: newId("inc"),
      updates: [],
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(incident.id, incident);
    return incident;
  }

  async addUpdate(
    id: string,
    body: string,
    status: PublicIncidentStatus,
    now: string,
  ): Promise<PublicIncident | undefined> {
    const existing = this.store.get(id);
    if (existing == null) return undefined;
    const update: IncidentUpdate = Object.freeze({
      id: newId("iupd"),
      body,
      status,
      createdAt: now,
    });
    const updated: PublicIncident = Object.freeze({
      ...existing,
      status,
      updates: [...existing.updates, update],
      resolvedAt: status === "resolved" ? now : existing.resolvedAt,
      updatedAt: now,
    });
    this.store.set(id, updated);
    return updated;
  }
}
