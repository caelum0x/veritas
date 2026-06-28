// Knowledge-package-specific error types extending the core AppError hierarchy.

import { AppError } from "@veritas/core";
import type { IsoTimestamp, AppErrorOptions } from "@veritas/core";

/** Base class for all knowledge-subsystem errors. */
export class KnowledgeError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("INTERNAL", 500, message, options);
    this.name = "KnowledgeError";
  }
}

/** Raised when a knowledge record is not found in the cache or store. */
export class KnowledgeNotFoundError extends AppError {
  constructor(fingerprint: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Knowledge record not found for fingerprint: ${fingerprint}`, {
      ...options,
      details: { fingerprint, ...options.details },
    });
    this.name = "KnowledgeNotFoundError";
  }
}

/** Raised when a cached fact has passed its TTL and is considered stale. */
export class KnowledgeStaleError extends AppError {
  constructor(fingerprint: string, cachedAt: IsoTimestamp, options: AppErrorOptions = {}) {
    super(
      "NOT_FOUND",
      404,
      `Knowledge record for fingerprint "${fingerprint}" is stale (cached at ${cachedAt})`,
      { ...options, details: { fingerprint, cachedAt, ...options.details } },
    );
    this.name = "KnowledgeStaleError";
  }
}

/** Raised when a knowledge-record invalidation operation fails. */
export class InvalidationError extends KnowledgeError {
  constructor(reason: string, ids: ReadonlyArray<string>, options: AppErrorOptions = {}) {
    super(`Invalidation failed: ${reason}`, { ...options, details: { reason, ids, ...options.details } });
    this.name = "InvalidationError";
  }
}

/** Raised when the knowledge store has reached its capacity limit. */
export class StoreCapacityError extends KnowledgeError {
  constructor(capacity: number, options: AppErrorOptions = {}) {
    super(`Knowledge store has reached its capacity of ${capacity} records`, {
      ...options,
      details: { capacity, ...options.details },
    });
    this.name = "StoreCapacityError";
  }
}

/** Raised when a duplicate record with the same fingerprint already exists. */
export class DuplicateKnowledgeError extends AppError {
  constructor(fingerprint: string, options: AppErrorOptions = {}) {
    super("CONFLICT", 409, `Knowledge record already exists for fingerprint: ${fingerprint}`, {
      ...options,
      details: { fingerprint, ...options.details },
    });
    this.name = "DuplicateKnowledgeError";
  }
}
