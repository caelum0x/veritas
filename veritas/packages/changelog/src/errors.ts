// Changelog-specific error types extending AppError.
import { AppError } from "@veritas/core";

export class ChangelogNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, "Changelog entry not found", {
      message: `Changelog entry not found: ${id}`,
      details: { id },
    });
  }
}

export class ChangelogVersionConflictError extends AppError {
  constructor(version: string) {
    super("CONFLICT", 409, "Changelog version conflict", {
      message: `Changelog version already exists: ${version}`,
      details: { version },
    });
  }
}

export class ChangelogValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION", 422, "Changelog validation error", {
      message,
      details: details ?? {},
    });
  }
}

export class ChangelogRenderError extends AppError {
  constructor(format: string, cause?: unknown) {
    super("INTERNAL", 500, "Changelog render error", {
      message: `Failed to render changelog as ${format}`,
      details: { format, cause: String(cause) },
    });
  }
}

export class ChangelogFeedError extends AppError {
  constructor(format: string, cause?: unknown) {
    super("INTERNAL", 500, "Changelog feed error", {
      message: `Failed to generate ${format} feed`,
      details: { format, cause: String(cause) },
    });
  }
}
