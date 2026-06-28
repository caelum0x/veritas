// Domain-specific error types for the corpus package.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Error thrown when a corpus cannot be found by id or name. */
export class CorpusNotFoundError extends AppError {
  constructor(identifier: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Corpus not found: ${identifier}`, options);
    this.name = "CorpusNotFoundError";
  }
}

/** Error thrown when a corpus record cannot be located. */
export class CorpusRecordNotFoundError extends AppError {
  constructor(recordId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Corpus record not found: ${recordId}`, options);
    this.name = "CorpusRecordNotFoundError";
  }
}

/** Error thrown when a snapshot is missing or expired. */
export class SnapshotNotFoundError extends AppError {
  constructor(snapshotId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Snapshot not found: ${snapshotId}`, options);
    this.name = "SnapshotNotFoundError";
  }
}

/** Error thrown when a corpus name conflicts with an existing corpus. */
export class CorpusConflictError extends AppError {
  constructor(name: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `A corpus with name "${name}" already exists`, options);
    this.name = "CorpusConflictError";
  }
}

/** Error thrown when a record fails corpus quality or authority thresholds. */
export class CorpusThresholdError extends AppError {
  constructor(detail: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Corpus threshold not met: ${detail}`, options);
    this.name = "CorpusThresholdError";
  }
}

/** Error thrown when a curation action is not permitted in the current state. */
export class CurationNotPermittedError extends AppError {
  constructor(action: string, reason: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Curation action "${action}" not permitted: ${reason}`, options);
    this.name = "CurationNotPermittedError";
  }
}

/** Error thrown when corpus import fails due to data issues. */
export class CorpusImportError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Corpus import failed: ${message}`, options);
    this.name = "CorpusImportError";
  }
}
