// StorageError — typed errors for object storage operations.
export type StorageErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "QUOTA_EXCEEDED"
  | "INVALID_KEY"
  | "UPLOAD_FAILED"
  | "DOWNLOAD_FAILED"
  | "DELETE_FAILED"
  | "LIST_FAILED"
  | "COPY_FAILED"
  | "MULTIPART_FAILED"
  | "UNKNOWN";

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;
  }
}

export function notFoundError(key: string): StorageError {
  return new StorageError("NOT_FOUND", `Object not found: ${key}`);
}

export function invalidKeyError(key: string, reason: string): StorageError {
  return new StorageError("INVALID_KEY", `Invalid key "${key}": ${reason}`);
}

export function uploadFailedError(key: string, cause?: unknown): StorageError {
  return new StorageError("UPLOAD_FAILED", `Failed to upload object: ${key}`, cause);
}

export function downloadFailedError(key: string, cause?: unknown): StorageError {
  return new StorageError("DOWNLOAD_FAILED", `Failed to download object: ${key}`, cause);
}

export function deleteFailedError(key: string, cause?: unknown): StorageError {
  return new StorageError("DELETE_FAILED", `Failed to delete object: ${key}`, cause);
}

export function listFailedError(prefix: string | undefined, cause?: unknown): StorageError {
  return new StorageError(
    "LIST_FAILED",
    `Failed to list objects${prefix ? ` with prefix "${prefix}"` : ""}`,
    cause,
  );
}

export function copyFailedError(src: string, dst: string, cause?: unknown): StorageError {
  return new StorageError("COPY_FAILED", `Failed to copy "${src}" to "${dst}"`, cause);
}

export function multipartFailedError(uploadId: string, cause?: unknown): StorageError {
  return new StorageError("MULTIPART_FAILED", `Multipart upload failed: ${uploadId}`, cause);
}

export function unknownError(message: string, cause?: unknown): StorageError {
  return new StorageError("UNKNOWN", message, cause);
}

export function isStorageError(value: unknown): value is StorageError {
  return value instanceof StorageError;
}
