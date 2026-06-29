// In-memory SessionRepository implementation backed by MemoryStore.
import { ok, err, systemClock, epochToIso, type Result, type Page } from "@veritas/core";
import type { Session } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { evalFilter, applySort, type QueryOptions } from "../query.js";
import type { SessionRepository, CreateSessionInput } from "../repositories/session.repository.js";
import { createDtoToSession } from "../mappers/session.mapper.js";

/** In-memory implementation of SessionRepository. */
export class SessionMemoryRepository implements SessionRepository {
  private readonly store = new MemoryStore<Session & { id: string }>();
  private readonly clock = systemClock;

  async findById(id: string): Promise<Result<Session>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("Session", id));
    }
    return ok(item);
  }

  async list(options?: QueryOptions<Session>): Promise<Result<Page<Session>>> {
    let rows = this.store.all();
    if (options?.filter !== undefined) {
      rows = rows.filter((r) => evalFilter(r, options.filter!));
    }
    if (options?.sort !== undefined && options.sort.length > 0) {
      rows = applySort(rows, options.sort);
    }
    return ok(paginateArray(rows, options?.page));
  }

  async create(dto: CreateSessionInput): Promise<Result<Session>> {
    const now = epochToIso(this.clock.now());
    const session = createDtoToSession(dto, now);
    const saved = this.store.set(session);
    return ok(saved);
  }

  async update(_id: string, _dto: Record<string, never>): Promise<Result<Session>> {
    return err(new RepositoryNotFoundError("Session", _id));
  }

  async delete(id: string): Promise<Result<Session>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Session", id));
    }
    this.store.delete(id);
    return ok(existing);
  }

  async findActiveByUserId(userId: string, options?: QueryOptions<Session>): Promise<Result<Page<Session>>> {
    const now = epochToIso(this.clock.now());
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "userId", operator: "eq", value: userId },
          { field: "revokedAt", operator: "isNull" },
          { field: "expiresAt", operator: "gt", value: now },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByUserId(userId: string, options?: QueryOptions<Session>): Promise<Result<Page<Session>>> {
    return this.list({
      ...options,
      filter: {
        and: [
          { field: "userId", operator: "eq", value: userId },
          ...(options?.filter?.and ?? []),
        ],
      },
    });
  }

  async findByHashedToken(hashedToken: string): Promise<Result<Session>> {
    const rows = this.store.all().filter((r) => r.hashedToken === hashedToken);
    if (rows.length === 0) {
      return err(new RepositoryNotFoundError("Session", hashedToken));
    }
    return ok(rows[0]!);
  }

  async revoke(id: string, revokedAt: string): Promise<Result<Session>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Session", id));
    }
    const updated: Session = {
      ...existing,
      revokedAt,
      updatedAt: epochToIso(this.clock.now()),
    };
    const saved = this.store.set(updated);
    return ok(saved);
  }

  async touch(id: string, lastActiveAt: string): Promise<Result<Session>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Session", id));
    }
    const updated: Session = {
      ...existing,
      lastActiveAt,
      updatedAt: epochToIso(this.clock.now()),
    };
    const saved = this.store.set(updated);
    return ok(saved);
  }
}
