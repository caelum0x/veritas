// Authorization errors for the Veritas RBAC system.

import { AppError, ErrorCode } from "@veritas/core";

/** Base class for all RBAC authorization errors. */
export class AuthzError extends AppError {
  constructor(message: string, code: ErrorCode, details?: Record<string, unknown>) {
    super(code, 400, message, { message, details });
    this.name = "AuthzError";
  }
}

/** Thrown when a subject lacks the required permission to perform an action. */
export class PermissionDeniedError extends AuthzError {
  constructor(
    public readonly permission: string,
    public readonly subjectId: string,
    public readonly resource?: string,
  ) {
    super(
      `Subject '${subjectId}' lacks permission '${permission}'${resource ? ` on '${resource}'` : ""}.`,
      "FORBIDDEN" as ErrorCode,
      { permission, subjectId, resource },
    );
    this.name = "PermissionDeniedError";
  }
}

/** Thrown when a role is not found in the store. */
export class RoleNotFoundError extends AuthzError {
  constructor(public readonly roleId: string) {
    super(
      `Role '${roleId}' not found.`,
      "NOT_FOUND" as ErrorCode,
      { roleId },
    );
    this.name = "RoleNotFoundError";
  }
}

/** Thrown when attempting to create a role that already exists. */
export class RoleAlreadyExistsError extends AuthzError {
  constructor(public readonly roleId: string) {
    super(
      `Role '${roleId}' already exists.`,
      "CONFLICT" as ErrorCode,
      { roleId },
    );
    this.name = "RoleAlreadyExistsError";
  }
}

/** Thrown when a policy rule produces a conflict (e.g. cyclic inheritance). */
export class PolicyConflictError extends AuthzError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFLICT" as ErrorCode, details);
    this.name = "PolicyConflictError";
  }
}

/** Thrown when a grant or revoke operation targets an invalid assignment. */
export class InvalidGrantError extends AuthzError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR" as ErrorCode, details);
    this.name = "InvalidGrantError";
  }
}

export function isAuthzError(value: unknown): value is AuthzError {
  return value instanceof AuthzError;
}

export function isPermissionDeniedError(value: unknown): value is PermissionDeniedError {
  return value instanceof PermissionDeniedError;
}

export function isRoleNotFoundError(value: unknown): value is RoleNotFoundError {
  return value instanceof RoleNotFoundError;
}
