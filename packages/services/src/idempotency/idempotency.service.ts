// Idempotency application service: deduplicates mutating requests via cached results.
import { Result, AppError, ok, contentHash, toPageRequest } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { IdempotencyKey, IdempotencyKeyStatus } from "@veritas/contracts";
import type { IdempotencyKeyRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import {
  ResourceNotFoundError,
  ServiceValidationError,
  IdempotencyConflictError,
} from "../errors.js";

/** TTL for idempotency keys: 24 hours in milliseconds. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Input for looking up or claiming an idempotency key. */
export interface ClaimIdempotencyKeyInput {
  readonly key: string;
  readonly organizationId?: string | null;
  readonly method: string;
  readonly path: string;
  readonly requestBody: unknown;
}

/** Input for recording the response of a completed idempotent operation. */
export interface CompleteIdempotencyKeyInput {
  readonly status: IdempotencyKeyStatus;
  readonly responseStatus: number;
  readonly responseBody: unknown;
}

/** Input for listing idempotency keys for an organization. */
export interface ListIdempotencyKeysInput {
  readonly organizationId?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Dependencies injected into IdempotencyService. */
export interface IdempotencyServiceDeps extends BaseServiceDeps {
  readonly idempotencyKeyRepository: IdempotencyKeyRepository;
}

/**
 * Application service that enforces idempotency on mutating operations.
 * Callers claim a key before executing work, then complete it with the result.
 */
export class IdempotencyService extends BaseService {
  private readonly keys: IdempotencyKeyRepository;

  constructor(deps: IdempotencyServiceDeps) {
    super(deps);
    this.keys = deps.idempotencyKeyRepository;
  }

  /**
   * Attempt to claim an idempotency key for a new request.
   * Returns the existing record if found (so the caller can replay the cached response),
   * or creates a new IN_PROGRESS record if this is a first-time request.
   * Throws IdempotencyConflictError if the key exists but with a different request hash.
   */
  async claim(
    ctx: ServiceContext,
    input: ClaimIdempotencyKeyInput,
  ): Promise<Result<IdempotencyKey, AppError>> {
    return serviceCall(async () => {
      if (!input.key || input.key.trim().length === 0) {
        throw new ServiceValidationError("Idempotency key must not be blank.");
      }
      if (!input.method || !input.path) {
        throw new ServiceValidationError("method and path are required.");
      }

      const requestHash = contentHash(JSON.stringify(input.requestBody ?? null));
      const existing = await this.keys.findByKey(input.key, input.organizationId ?? null);

      if (existing.ok) {
        const record = existing.value;
        if (record.requestHash !== requestHash) {
          throw new IdempotencyConflictError(input.key);
        }
        this.log(ctx, "debug", "idempotency.hit", { key: input.key, status: record.status });
        return record;
      }

      const expiresAt = new Date(this.clock.now() + IDEMPOTENCY_TTL_MS).toISOString();
      const result = await this.keys.create({
        key: input.key,
        organizationId: input.organizationId ?? null,
        method: input.method,
        path: input.path,
        requestHash,
        expiresAt,
      });

      if (!result.ok) {
        throw result.error;
      }

      this.log(ctx, "info", "idempotency.claimed", { key: input.key, id: result.value.id });
      return result.value;
    });
  }

  /**
   * Record the outcome of an idempotent operation against a previously claimed key id.
   * Sets status to COMPLETED or FAILED and stores the response payload.
   */
  async complete(
    ctx: ServiceContext,
    id: string,
    input: CompleteIdempotencyKeyInput,
  ): Promise<Result<IdempotencyKey, AppError>> {
    return serviceCall(async () => {
      const existing = await this.keys.findById(id);
      if (!existing.ok) {
        throw new ResourceNotFoundError("IdempotencyKey", id);
      }

      const result = await this.keys.update(id, {
        status: input.status,
        responseStatus: input.responseStatus,
        responseBody: input.responseBody,
      });

      if (!result.ok) {
        throw new ResourceNotFoundError("IdempotencyKey", id);
      }

      this.log(ctx, "info", "idempotency.completed", {
        id,
        status: input.status,
        responseStatus: input.responseStatus,
      });
      return result.value;
    });
  }

  /** Retrieve an idempotency key record by its id. */
  async getById(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<IdempotencyKey, AppError>> {
    return serviceCall(async () => {
      const result = await this.keys.findById(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("IdempotencyKey", id);
      }
      this.log(ctx, "debug", "idempotency.getById", { id });
      return result.value;
    });
  }

  /** Look up an idempotency key by its raw key string. */
  async getByKey(
    ctx: ServiceContext,
    key: string,
    organizationId?: string | null,
  ): Promise<Result<IdempotencyKey, AppError>> {
    return serviceCall(async () => {
      if (!key || key.trim().length === 0) {
        throw new ServiceValidationError("Idempotency key must not be blank.");
      }
      const result = await this.keys.findByKey(key, organizationId);
      if (!result.ok) {
        throw new ResourceNotFoundError("IdempotencyKey", key);
      }
      this.log(ctx, "debug", "idempotency.getByKey", { key });
      return result.value;
    });
  }

  /** List idempotency keys for an organization with pagination. */
  async listByOrganization(
    ctx: ServiceContext,
    input: ListIdempotencyKeysInput,
  ): Promise<Result<Page<IdempotencyKey>, AppError>> {
    return serviceCall(async () => {
      if (!input.organizationId) {
        throw new ServiceValidationError("organizationId is required.");
      }
      const page = toPageRequest({ cursor: input.cursor, limit: input.limit });
      const result = await this.keys.findByOrganizationId(input.organizationId, { page: page });
      if (!result.ok) throw result.error;
      this.log(ctx, "debug", "idempotency.listByOrganization", {
        organizationId: input.organizationId,
        count: result.value.items.length,
      });
      return result.value;
    });
  }

  /** Purge expired idempotency keys (scheduled maintenance task). */
  async purgeExpired(
    ctx: ServiceContext,
  ): Promise<Result<number, AppError>> {
    return serviceCall(async () => {
      const now = new Date(this.clock.now()).toISOString();
      const page = toPageRequest({ limit: 500 });
      const result = await this.keys.findExpired(now, { page: page });
      if (!result.ok) throw result.error;

      let purged = 0;
      for (const record of result.value.items) {
        const del = await this.keys.delete(record.id);
        if (del.ok) purged++;
      }

      this.log(ctx, "info", "idempotency.purgedExpired", { count: purged });
      return purged;
    });
  }
}
