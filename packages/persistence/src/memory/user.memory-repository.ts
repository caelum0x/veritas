// In-memory implementation of UserRepository backed by MemoryStore.

import {
  ok,
  err,
  epochToIso,
  makePage,
  encodeCursor,
  decodeCursor,
  toPageRequest,
  isOk,
} from "@veritas/core";
import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { User, CreateUser, UpdateUser } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import type { UserRepository, UserFilters } from "../repositories/user.repository.js";
import { createDtoToRow, mergeRow, rowToUser } from "../mappers/user.mapper.js";
import type { UserRow } from "../mappers/user.mapper.js";

export class UserMemoryRepository implements UserRepository {
  private readonly store = new MemoryStore<UserRow & { id: string }>();

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("User", id));
    }
    return ok(rowToUser(item));
  }

  async findByEmail(email: string): Promise<Result<User, NotFoundError>> {
    const match = this.store.all().find((r) => r.email === email);
    if (match === undefined) {
      return err(new RepositoryNotFoundError("User", email));
    }
    return ok(rowToUser(match));
  }

  async list(filters: UserFilters, page: PageRequest): Promise<Page<User>> {
    const req = toPageRequest(page);
    let items = this.store.all();

    if (filters.email !== undefined) {
      items = items.filter((r) => r.email === filters.email);
    }
    if (filters.status !== undefined) {
      items = items.filter((r) => r.status === filters.status);
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (req.cursor !== undefined) {
      const cursorResult = decodeCursor(req.cursor);
      if (isOk(cursorResult)) {
        const afterId = String(cursorResult.value["id"] ?? "");
        const idx = items.findIndex((r) => r.id === afterId);
        if (idx !== -1) {
          items = items.slice(idx + 1);
        }
      }
    }

    const pageItems = items.slice(0, req.limit);
    const hasMore = items.length > req.limit;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? encodeCursor({ id: pageItems[pageItems.length - 1]!.id })
        : null;

    return makePage(pageItems.map(rowToUser), nextCursor);
  }

  async create(data: CreateUser): Promise<Result<User, ConflictError>> {
    const existing = this.store.all().find((r) => r.email === data.email);
    if (existing !== undefined) {
      return err(
        new RepositoryConflictError("User", `email ${data.email} already exists`),
      );
    }

    const now = epochToIso(Date.now());
    const row = createDtoToRow(data, now);
    const stored = this.store.set(row);
    return ok(rowToUser(stored));
  }

  async update(id: string, data: UpdateUser): Promise<Result<User, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("User", id));
    }

    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, data, now);
    const stored = this.store.set(updated);
    return ok(rowToUser(stored));
  }

  async delete(id: string): Promise<Result<User, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("User", id));
    }
    this.store.delete(id);
    return ok(rowToUser(existing));
  }
}
