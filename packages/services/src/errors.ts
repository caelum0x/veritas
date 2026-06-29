// Application-layer error types for the services package.
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  UnavailableError,
} from "@veritas/core";

/** Error raised when a requested resource does not exist. */
export class ResourceNotFoundError extends NotFoundError {
  constructor(resource: string, id: string) {
    super({ message: `${resource} with id '${id}' was not found.` });
    this.name = "ResourceNotFoundError";
  }
}

/** Error raised when an operation would create a duplicate resource. */
export class DuplicateResourceError extends ConflictError {
  constructor(resource: string, field: string, value: string) {
    super({ message: `${resource} with ${field} '${value}' already exists.` });
    this.name = "DuplicateResourceError";
  }
}

/** Error raised when input data fails schema or business-rule validation. */
export class ServiceValidationError extends ValidationError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super({ message });
    this.name = "ServiceValidationError";
  }
}

/** Error raised when the caller is not authenticated. */
export class NotAuthenticatedError extends UnauthorizedError {
  constructor() {
    super({ message: "Authentication is required to perform this action." });
    this.name = "NotAuthenticatedError";
  }
}

/** Error raised when the caller lacks permission for the requested action. */
export class InsufficientPermissionsError extends ForbiddenError {
  constructor(action: string) {
    super({ message: `You do not have permission to perform: ${action}.` });
    this.name = "InsufficientPermissionsError";
  }
}

/** Error raised when a caller has exceeded their rate or quota limit. */
export class QuotaExceededError extends RateLimitedError {
  constructor(resource: string, limit: number, unit: string) {
    super({ message: `Rate limit exceeded: ${limit} ${resource} per ${unit}.` });
    this.name = "QuotaExceededError";
  }
}

/** Error raised when a downstream dependency is temporarily unavailable. */
export class DependencyUnavailableError extends UnavailableError {
  constructor(dependency: string) {
    super({ message: `Dependency '${dependency}' is currently unavailable. Please retry.` });
    this.name = "DependencyUnavailableError";
  }
}

/** Error raised when a business-rule precondition is not satisfied. */
export class PreconditionFailedError extends ValidationError {
  constructor(message: string) {
    super({ message });
    this.name = "PreconditionFailedError";
  }
}

/** Error raised when an idempotent operation is replayed with different inputs. */
export class IdempotencyConflictError extends ConflictError {
  constructor(key: string) {
    super({ message: `Idempotency key '${key}' was already used with different request parameters.` });
    this.name = "IdempotencyConflictError";
  }
}

/** Re-export shared base for convenience. */
export { AppError };
