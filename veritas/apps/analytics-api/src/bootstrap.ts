// Bootstrap helpers — in-memory store factories used by container.ts.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { DashboardNotFoundError, DashboardConflictError, DashboardValidationError } from "@veritas/dashboards";

/** Minimal dashboard shape stored in-memory by this service. */
export interface LocalDashboard {
  readonly id: string;
  readonly orgId: string;
  readonly title: string;
  readonly description?: string;
  readonly visibility: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
  readonly [key: string]: unknown;
}

/** Minimal CRUD interface for dashboard storage. */
export interface DashboardStore {
  list(orgId: string): readonly LocalDashboard[];
  findById(id: string): Result<LocalDashboard, DashboardNotFoundError>;
  create(input: Record<string, unknown>): Result<LocalDashboard, DashboardConflictError | DashboardValidationError>;
  update(id: string, patch: Record<string, unknown>): Result<LocalDashboard, DashboardNotFoundError | DashboardValidationError>;
  archive(id: string): Result<LocalDashboard, DashboardNotFoundError>;
  remove(id: string): Result<true, DashboardNotFoundError>;
  delete(id: string): Result<true, DashboardNotFoundError>;
}

class InMemoryDashboardStore implements DashboardStore {
  readonly #byId = new Map<string, LocalDashboard>();

  list(orgId: string): readonly LocalDashboard[] {
    return Array.from(this.#byId.values())
      .filter((d) => d.orgId === orgId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findById(id: string): Result<LocalDashboard, DashboardNotFoundError> {
    const d = this.#byId.get(id);
    return d ? ok(d) : err(new DashboardNotFoundError(id));
  }

  create(input: Record<string, unknown>): Result<LocalDashboard, DashboardConflictError | DashboardValidationError> {
    if (typeof input["title"] !== "string" || !input["title"]) {
      return err(new DashboardValidationError("title is required"));
    }
    if (typeof input["orgId"] !== "string" || !input["orgId"]) {
      return err(new DashboardValidationError("orgId is required"));
    }
    const now = new Date().toISOString();
    const id = `dash_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const dashboard: LocalDashboard = {
      ...input,
      id,
      orgId: input["orgId"] as string,
      title: input["title"] as string,
      visibility: typeof input["visibility"] === "string" ? input["visibility"] : "private",
      tags: Array.isArray(input["tags"]) ? (input["tags"] as string[]) : [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    this.#byId.set(id, dashboard);
    return ok(dashboard);
  }

  update(id: string, patch: Record<string, unknown>): Result<LocalDashboard, DashboardNotFoundError | DashboardValidationError> {
    const existing = this.#byId.get(id);
    if (!existing) return err(new DashboardNotFoundError(id));
    const updated: LocalDashboard = {
      ...existing,
      ...patch,
      id: existing.id,
      orgId: existing.orgId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      archivedAt: existing.archivedAt,
    };
    this.#byId.set(id, updated);
    return ok(updated);
  }

  archive(id: string): Result<LocalDashboard, DashboardNotFoundError> {
    const existing = this.#byId.get(id);
    if (!existing) return err(new DashboardNotFoundError(id));
    const archived: LocalDashboard = {
      ...existing,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.#byId.set(id, archived);
    return ok(archived);
  }

  remove(id: string): Result<true, DashboardNotFoundError> {
    if (!this.#byId.has(id)) return err(new DashboardNotFoundError(id));
    this.#byId.delete(id);
    return ok(true);
  }

  delete(id: string): Result<true, DashboardNotFoundError> {
    return this.remove(id);
  }
}

/** Factory that returns a new in-memory DashboardStore instance. */
export function buildDashboardStore(): DashboardStore {
  return new InMemoryDashboardStore();
}
