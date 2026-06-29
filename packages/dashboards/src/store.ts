// In-memory dashboard store: CRUD operations over Dashboard records.
import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import {
  DashboardNotFoundError,
  DashboardConflictError,
  DashboardValidationError,
} from "./errors.js";
import { dashboardId, VisibilitySchema, type DashboardId } from "./types.js";

export const DashboardSchema = z.object({
  id: z.string(),
  slug: z.string().min(1).max(128),
  title: z.string().min(1).max(256),
  description: z.string().max(1024).default(""),
  visibility: VisibilitySchema,
  ownerId: z.string(),
  orgId: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

export const CreateDashboardSchema = DashboardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
});
export type CreateDashboard = z.infer<typeof CreateDashboardSchema>;

export const UpdateDashboardSchema = CreateDashboardSchema.partial();
export type UpdateDashboard = z.infer<typeof UpdateDashboardSchema>;

export type DashboardStoreError =
  | DashboardNotFoundError
  | DashboardConflictError
  | DashboardValidationError;

/** In-memory CRUD store for Dashboard entities. */
export class InMemoryDashboardStore {
  readonly #byId = new Map<string, Dashboard>();
  readonly #slugIndex = new Map<string, string>(); // slug -> id

  create(input: CreateDashboard): Result<Dashboard, DashboardConflictError | DashboardValidationError> {
    const parsed = CreateDashboardSchema.safeParse(input);
    if (!parsed.success) {
      return err(new DashboardValidationError(parsed.error.message));
    }
    const data = parsed.data;
    if (this.#slugIndex.has(data.slug)) {
      return err(new DashboardConflictError(`Slug already exists: ${data.slug}`));
    }
    const now = new Date().toISOString();
    const dashboard: Dashboard = {
      ...data,
      id: dashboardId(newId("dashboard")) as string,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    this.#byId.set(dashboard.id, dashboard);
    this.#slugIndex.set(dashboard.slug, dashboard.id);
    return ok(dashboard);
  }

  findById(id: DashboardId): Result<Dashboard, DashboardNotFoundError> {
    const d = this.#byId.get(id as string);
    return d ? ok(d) : err(new DashboardNotFoundError(id as string));
  }

  findBySlug(slug: string): Result<Dashboard, DashboardNotFoundError> {
    const id = this.#slugIndex.get(slug);
    if (!id) return err(new DashboardNotFoundError(`slug:${slug}`));
    return this.findById(dashboardId(id));
  }

  update(
    id: DashboardId,
    patch: UpdateDashboard,
  ): Result<Dashboard, DashboardNotFoundError | DashboardConflictError | DashboardValidationError> {
    const existing = this.#byId.get(id as string);
    if (!existing) return err(new DashboardNotFoundError(id as string));

    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      const conflict = this.#slugIndex.get(patch.slug);
      if (conflict && conflict !== (id as string)) {
        return err(new DashboardConflictError(`Slug already exists: ${patch.slug}`));
      }
    }

    const merged = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    const parsed = DashboardSchema.safeParse(merged);
    if (!parsed.success) {
      return err(new DashboardValidationError(parsed.error.message));
    }

    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      this.#slugIndex.delete(existing.slug);
      this.#slugIndex.set(patch.slug, id as string);
    }

    this.#byId.set(id as string, parsed.data);
    return ok(parsed.data);
  }

  archive(id: DashboardId): Result<Dashboard, DashboardNotFoundError> {
    const existing = this.#byId.get(id as string);
    if (!existing) return err(new DashboardNotFoundError(id as string));
    const archived: Dashboard = { ...existing, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.#byId.set(id as string, archived);
    return ok(archived);
  }

  delete(id: DashboardId): Result<true, DashboardNotFoundError> {
    const existing = this.#byId.get(id as string);
    if (!existing) return err(new DashboardNotFoundError(id as string));
    this.#slugIndex.delete(existing.slug);
    this.#byId.delete(id as string);
    return ok(true);
  }

  list(orgId: string): readonly Dashboard[] {
    return Array.from(this.#byId.values())
      .filter((d) => d.orgId === orgId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

