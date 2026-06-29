// ValidationError: input failed schema or business-rule validation.

import { AppError, type AppErrorOptions } from "./base-error.js";

/** A single field-level validation issue. */
export interface FieldIssue {
  readonly path: string;
  readonly message: string;
}

export class ValidationError extends AppError {
  readonly issues: readonly FieldIssue[];

  constructor(options: AppErrorOptions & { issues?: readonly FieldIssue[] } = {}) {
    super("VALIDATION", 422, "Validation failed", options);
    this.issues = options.issues ?? [];
  }

  /** Build from a list of field issues. */
  static fromIssues(issues: readonly FieldIssue[]): ValidationError {
    return new ValidationError({
      message: `Validation failed (${issues.length} issue${issues.length === 1 ? "" : "s"})`,
      issues,
      details: { issues },
    });
  }
}
