// IdempotencyKeyRepository interface for deduplicating mutating API requests.
import type { Result, Page } from "@veritas/core";
import type { IdempotencyKey, CreateIdempotencyKey, IdempotencyKeyStatus } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Fields that can be updated on an existing IdempotencyKey. */
export interface UpdateIdempotencyKey {
  readonly status?: IdempotencyKeyStatus;
  readonly responseStatus?: number | null;
  readonly responseBody?: unknown;
}

/** Extended repository interface for IdempotencyKey entities. */
export interface IdempotencyKeyRepository
  extends BaseRepository<IdempotencyKey, CreateIdempotencyKey, UpdateIdempotencyKey> {
  /** Find a single idempotency key record by its opaque ID. */
  findById(id: string): Promise<Result<IdempotencyKey>>;

  /** List idempotency key records with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<IdempotencyKey>): Promise<Result<Page<IdempotencyKey>>>;

  /** Persist a new idempotency key record. */
  create(dto: CreateIdempotencyKey): Promise<Result<IdempotencyKey>>;

  /** Update status or response payload on an existing idempotency key. */
  update(id: string, dto: UpdateIdempotencyKey): Promise<Result<IdempotencyKey>>;

  /** Remove an idempotency key record by ID. */
  delete(id: string): Promise<Result<IdempotencyKey>>;

  /** Look up an idempotency key by its raw key string, within an optional org scope. */
  findByKey(key: string, organizationId?: string | null): Promise<Result<IdempotencyKey>>;

  /** Return all expired idempotency keys (expiresAt <= now). */
  findExpired(now: string, options?: QueryOptions<IdempotencyKey>): Promise<Result<Page<IdempotencyKey>>>;

  /** Return all records belonging to a specific organization. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<IdempotencyKey>): Promise<Result<Page<IdempotencyKey>>>;
}
