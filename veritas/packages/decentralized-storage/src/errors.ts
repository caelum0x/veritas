// Domain errors for the decentralized-storage package.

import { AppError } from "@veritas/core";

export type StorageErrorCode =
  | "STORAGE_NOT_FOUND"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_ENCODE_FAILED"
  | "STORAGE_DECODE_FAILED"
  | "STORAGE_PIN_FAILED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_INVALID_CID"
  | "STORAGE_CHUNK_FAILED"
  | "STORAGE_PROVENANCE_FAILED";

export class StorageError extends AppError {
  readonly storageCode: StorageErrorCode;
  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, message, { message, cause });
    this.storageCode = code;
    this.name = "StorageError";
  }
}

export function notFoundError(cid: string): StorageError {
  return new StorageError("STORAGE_NOT_FOUND", `Blob not found: ${cid}`);
}

export function unavailableError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_UNAVAILABLE", `Storage unavailable: ${detail}`, cause);
}

export function encodeError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_ENCODE_FAILED", `Encode failed: ${detail}`, cause);
}

export function decodeError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_DECODE_FAILED", `Decode failed: ${detail}`, cause);
}

export function pinError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_PIN_FAILED", `Pin failed: ${detail}`, cause);
}

export function invalidCidError(raw: string): StorageError {
  return new StorageError("STORAGE_INVALID_CID", `Invalid CID: ${raw}`);
}

export function chunkError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_CHUNK_FAILED", `Chunk failed: ${detail}`, cause);
}

export function provenanceError(detail: string, cause?: unknown): StorageError {
  return new StorageError("STORAGE_PROVENANCE_FAILED", `Provenance store failed: ${detail}`, cause);
}

export function quotaExceededError(detail: string): StorageError {
  return new StorageError("STORAGE_QUOTA_EXCEEDED", `Quota exceeded: ${detail}`);
}
