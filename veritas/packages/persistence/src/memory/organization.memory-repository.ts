// In-memory implementation of OrganizationRepository backed by MemoryStore.

import { ok, err, epochToIso, makePage, encodeCursor, decodeCursor, toPageRequest, isOk } from "@veritas/core";
import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Organization, CreateOrganization, UpdateOrganization } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { createDtoToRow, mergeRow, rowToOrganization } from "../mappers/organization.mapper.js";
import type { OrganizationRow } from "../mappers/organization.mapper.js";

/** Filter options for listing organizations. */
export interface OrganizationFilters {
  readonly ownerId?: string;
  readonly slug?: string;
}

/** In-memory repository for Organization entities. */
export class OrganizationMemoryRepository {
  private readonly store = new MemoryStore<OrganizationRow & { id: string }>();

  async findById(id: string): Promise<Result<Organization, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Organization", id));
    }
    return ok(rowToOrganization(row));
  }

  async findBySlug(slug: string): Promise<Result<Organization, NotFoundError>> {
    const match = this.store.all().find((r) => r.slug === slug);
    if (match === undefined) {
      return err(new RepositoryNotFoundError("Organization", slug));
    }
    return ok(rowToOrganization(match));
  }

  async list(filters: OrganizationFilters, page: PageRequest): Promise<Page<Organization>> {
    const req = toPageRequest(page);
    let rows = this.store.all();

    if (filters.ownerId !== undefined) {
      rows = rows.filter((r) => r.ownerId === filters.ownerId);
    }
    if (filters.slug !== undefined) {
      rows = rows.filter((r) => r.slug === filters.slug);
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    if (req.cursor !== undefined) {
      const cursorResult = decodeCursor(req.cursor);
      if (isOk(cursorResult)) {
        const afterId = String(cursorResult.value["id"] ?? "");
        const idx = rows.findIndex((r) => r.id === afterId);
        if (idx !== -1) {
          rows = rows.slice(idx + 1);
        }
      }
    }

    const pageItems = rows.slice(0, req.limit);
    const hasMore = rows.length > req.limit;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? encodeCursor({ id: pageItems[pageItems.length - 1]!.id })
        : null;

    return makePage(pageItems.map(rowToOrganization), nextCursor);
  }

  async create(data: CreateOrganization): Promise<Result<Organization, ConflictError>> {
    const existing = this.store.all().find((r) => r.slug === data.slug);
    if (existing !== undefined) {
      return err(new RepositoryConflictError("Organization", `slug '${data.slug}' already in use`));
    }

    const now = epochToIso(Date.now());
    const row = createDtoToRow(data, now);
    const stored = this.store.set(row);
    return ok(rowToOrganization(stored));
  }

  async update(id: string, data: UpdateOrganization): Promise<Result<Organization, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Organization", id));
    }

    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, data, now);
    const stored = this.store.set(updated);
    return ok(rowToOrganization(stored));
  }

  async delete(id: string): Promise<Result<Organization, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Organization", id));
    }
    this.store.delete(id);
    return ok(rowToOrganization(existing));
  }
}
