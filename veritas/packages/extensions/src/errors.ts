// Extension-specific error types built on top of @veritas/core AppError.
import { AppError } from "@veritas/core";

export class ExtensionNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Extension not found: ${id}`, { details: { id } });
  }
}

export class ExtensionConflictError extends AppError {
  constructor(id: string) {
    super("CONFLICT", 409, `Extension already registered: ${id}`, { details: { id } });
  }
}

export class HookExecutionError extends AppError {
  constructor(hook: string, cause: unknown) {
    super("INTERNAL", 500, `Hook execution failed for: ${hook}`, { cause, details: { hook } });
  }
}

export class MiddlewareError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
  }
}

export class ExtensionDisabledError extends AppError {
  constructor(id: string) {
    super("FORBIDDEN", 403, `Extension is disabled: ${id}`, { details: { id } });
  }
}

export class ExtensionContextError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, `Extension context error: ${message}`);
  }
}
