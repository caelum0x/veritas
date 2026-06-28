// In-memory implementation of MembershipRepository backed by MemoryStore.

import { ok, err, epochToIso, makePage, encodeCursor, decodeCursor, toPageRequest, isOk } from "@veritas/core";
import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Membership, CreateMembership, UpdateMembership } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { createDtoToRow, mergeRow, rowToMembership } from "../mappers/membership.mapper.js";
import type { MembershipRow } from "../mappers/membership.mapper.js";
import type { MembershipRepository, MembershipFilters } from "../repositories/membership.repository.js";

/** In-memory repository for Membership entities. */
export class MembershipMemoryRepository implements MembershipRepository {
  private readonly store = new MemoryStore<MembershipRow & { id: string }>();

  async findById(id: string): Promise<Result<Membership, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Membership", id));
    }
    return ok(rowToMembership(row));
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<Result<Membership, NotFoundError>> {
    const match = this.store
      .all()
      .find((r) => r.organizationId === organizationId && r.userId === userId);
    if (match === undefined) {
      return err(
        new RepositoryNotFoundError(
          "Membership",
          `org=${organizationId} user=${userId}`,
        ),
      );
    }
    return ok(rowToMembership(match));
  }

  async list(filters: MembershipFilters, page: PageRequest): Promise<Page<Membership>> {
    const req = toPageRequest(page);
    let rows = this.store.all();

    if (filters.organizationId !== undefined) {
      rows = rows.filter((r) => r.organizationId === filters.organizationId);
    }
    if (filters.userId !== undefined) {
      rows = rows.filter((r) => r.userId === filters.userId);
    }
    if (filters.role !== undefined) {
      rows = rows.filter((r) => r.role === filters.role);
    }

    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

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

    return makePage(pageItems.map(rowToMembership), nextCursor);
  }

  async create(data: CreateMembership): Promise<Result<Membership, ConflictError>> {
    const existing = this.store
      .all()
      .find((r) => r.organizationId === data.organizationId && r.userId === data.userId);

    if (existing !== undefined) {
      return err(
        new RepositoryConflictError(
          "Membership",
          `user ${data.userId} is already a member of org ${data.organizationId}`,
        ),
      );
    }

    const now = epochToIso(Date.now());
    const row = createDtoToRow(data, now);
    const stored = this.store.set(row);
    return ok(rowToMembership(stored));
  }

  async update(id: string, data: UpdateMembership): Promise<Result<Membership, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Membership", id));
    }

    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, data, now);
    const stored = this.store.set(updated);
    return ok(rowToMembership(stored));
  }

  async delete(id: string): Promise<Result<Membership, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Membership", id));
    }
    this.store.delete(id);
    return ok(rowToMembership(existing));
  }
}
