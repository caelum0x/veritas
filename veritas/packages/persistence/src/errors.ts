// Persistence-layer error types for repository not-found and conflict conditions.

import { NotFoundError, ConflictError } from "@veritas/core";

/** Raised when a repository lookup finds no matching record. */
export class RepositoryNotFoundError extends NotFoundError {
  constructor(entity: string, id: string) {
    super({ message: `${entity} not found: ${id}`, details: { entity, id } });
  }
}

/** Raised when a create or update would violate a uniqueness constraint. */
export class RepositoryConflictError extends ConflictError {
  constructor(entity: string, reason: string) {
    super({ message: `${entity} conflict: ${reason}`, details: { entity, reason } });
  }
}
