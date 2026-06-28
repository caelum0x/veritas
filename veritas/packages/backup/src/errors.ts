// Backup-specific error types extending AppError vocabulary.
import { AppError, type AppErrorOptions } from "@veritas/core";

export type BackupError =
  | BackupNotFoundError
  | BackupCorruptError
  | BackupEncryptionError
  | BackupStoreError
  | BackupScheduleError;

export class BackupNotFoundError extends AppError {
  constructor(id: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Backup not found: ${id}`, opts);
  }
}

export class BackupCorruptError extends AppError {
  constructor(id: string, detail?: string, opts?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      `Backup integrity check failed for ${id}${detail ? `: ${detail}` : ""}`,
      opts,
    );
  }
}

export class BackupEncryptionError extends AppError {
  constructor(detail?: string, opts?: AppErrorOptions) {
    super(
      "INTERNAL",
      500,
      `Backup encryption/decryption error${detail ? `: ${detail}` : ""}`,
      opts,
    );
  }
}

export class BackupStoreError extends AppError {
  constructor(detail?: string, opts?: AppErrorOptions) {
    super(
      "UNAVAILABLE",
      503,
      `Backup store error${detail ? `: ${detail}` : ""}`,
      opts,
    );
  }
}

export class BackupScheduleError extends AppError {
  constructor(detail?: string, opts?: AppErrorOptions) {
    super(
      "VALIDATION",
      400,
      `Backup schedule error${detail ? `: ${detail}` : ""}`,
      opts,
    );
  }
}
