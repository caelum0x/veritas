// In-memory implementation of ApiKeyRepository backed by MemoryStore.

import { ok, err, epochToIso, sha256Hex } from "@veritas/core";
import type { Result, Page, PageRequest } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { ApiKey, CreateApiKey } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import {
  type ApiKeyRow,
  rowToApiKey,
  createDtoToRow,
  mergeRow,
  markUsed,
  markRevoked,
} from "../mappers/apiKey.mapper.js";

/** Repository abstraction for ApiKey entities. */
export interface ApiKeyFilters {
  readonly organizationId?: string;
  readonly userId?: string;
  readonly revoked?: boolean;
}

export interface ApiKeyRepository {
  findById(id: string): Promise<Result<ApiKey, NotFoundError>>;
  findByPrefix(prefix: string): Promise<Result<ApiKey, NotFoundError>>;
  list(filters: ApiKeyFilters, page: PageRequest): Promise<Page<ApiKey>>;
  create(data: CreateApiKey, secret: string): Promise<Result<ApiKey, ConflictError>>;
  update(id: string, data: Partial<CreateApiKey>): Promise<Result<ApiKey, NotFoundError>>;
  revoke(id: string): Promise<Result<ApiKey, NotFoundError>>;
  markUsed(id: string): Promise<Result<ApiKey, NotFoundError>>;
  delete(id: string): Promise<Result<void, NotFoundError>>;
}

/** Key prefix length used when generating API key tokens. */
const PREFIX_LENGTH = 8;

/** Extract the prefix portion of a raw secret string. */
function extractPrefix(secret: string): string {
  return secret.slice(0, PREFIX_LENGTH);
}

export class ApiKeyMemoryRepository implements ApiKeyRepository {
  private readonly store = new MemoryStore<ApiKeyRow>();

  async findById(id: string): Promise<Result<ApiKey, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("ApiKey", id));
    }
    return ok(rowToApiKey(row));
  }

  async findByPrefix(prefix: string): Promise<Result<ApiKey, NotFoundError>> {
    const row = this.store.all().find((r) => r.prefix === prefix);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("ApiKey", prefix));
    }
    return ok(rowToApiKey(row));
  }

  async list(filters: ApiKeyFilters, page: PageRequest): Promise<Page<ApiKey>> {
    let rows = this.store.all();

    if (filters.organizationId !== undefined) {
      rows = rows.filter((r) => r.organizationId === filters.organizationId);
    }
    if (filters.userId !== undefined) {
      rows = rows.filter((r) => r.userId === filters.userId);
    }
    if (filters.revoked !== undefined) {
      rows = filters.revoked
        ? rows.filter((r) => r.revokedAt !== null)
        : rows.filter((r) => r.revokedAt === null);
    }

    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const domainItems = rows.map(rowToApiKey);
    return paginateArray(domainItems, page);
  }

  async create(
    data: CreateApiKey,
    secret: string,
  ): Promise<Result<ApiKey, ConflictError>> {
    const prefix = extractPrefix(secret);
    const existing = this.store.all().find((r) => r.prefix === prefix);
    if (existing !== undefined) {
      return err(
        new RepositoryConflictError("ApiKey", `prefix ${prefix} already exists`),
      );
    }

    const hashedKey = sha256Hex(secret);
    const now = epochToIso(Date.now());
    const row = createDtoToRow(data, prefix, hashedKey, now);
    const stored = this.store.set(row);
    return ok(rowToApiKey(stored));
  }

  async update(
    id: string,
    data: Partial<CreateApiKey>,
  ): Promise<Result<ApiKey, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("ApiKey", id));
    }

    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, data, now);
    const stored = this.store.set(updated);
    return ok(rowToApiKey(stored));
  }

  async revoke(id: string): Promise<Result<ApiKey, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("ApiKey", id));
    }

    const now = epochToIso(Date.now());
    const updated = markRevoked(existing, now);
    const stored = this.store.set(updated);
    return ok(rowToApiKey(stored));
  }

  async markUsed(id: string): Promise<Result<ApiKey, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("ApiKey", id));
    }

    const now = epochToIso(Date.now());
    const updated = markUsed(existing, now);
    const stored = this.store.set(updated);
    return ok(rowToApiKey(stored));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("ApiKey", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
