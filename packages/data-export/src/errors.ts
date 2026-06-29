// Export-specific error types for @veritas/data-export.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class ExportNotFoundError extends AppError {
  readonly kind = "EXPORT_NOT_FOUND" as const;
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Export not found: ${id}`, opts);
  }
}

export class DestinationNotFoundError extends AppError {
  readonly kind = "DESTINATION_NOT_FOUND" as const;
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Destination not found: ${id}`, opts);
  }
}

export class ScheduleNotFoundError extends AppError {
  readonly kind = "SCHEDULE_NOT_FOUND" as const;
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Schedule not found: ${id}`, opts);
  }
}

export class ExportConflictError extends AppError {
  readonly kind = "EXPORT_CONFLICT" as const;
  constructor(msg: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, msg, opts);
  }
}

export class ExportValidationError extends AppError {
  readonly kind = "EXPORT_VALIDATION" as const;
  constructor(msg: string, opts?: AppErrorOptions) {
    super("VALIDATION", 422, msg, opts);
  }
}

export class DestinationUnreachableError extends AppError {
  readonly kind = "DESTINATION_UNREACHABLE" as const;
  constructor(dest: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `Destination unreachable: ${dest}`, opts);
  }
}

export class ExportFormatError extends AppError {
  readonly kind = "EXPORT_FORMAT" as const;
  constructor(msg: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, msg, opts);
  }
}
