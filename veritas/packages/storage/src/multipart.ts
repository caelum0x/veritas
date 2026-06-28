// Multipart upload interface — chunked upload protocol for large objects.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { StoredObject } from "./object.js";
import { makeStoredObject } from "./object.js";
import type { StorageError } from "./errors.js";
import { multipartFailedError, notFoundError } from "./errors.js";
import { sha256Hex } from "@veritas/core";

export interface MultipartUploadOptions {
  readonly contentType?: string;
  readonly metadata?: Record<string, string>;
}

export interface UploadPart {
  readonly partNumber: number;
  readonly etag: string;
  readonly size: number;
}

export interface MultipartUpload {
  readonly uploadId: string;
  readonly key: string;
  readonly createdAt: Date;
}

export interface MultipartUploadManager {
  initiate(
    key: string,
    options?: MultipartUploadOptions,
  ): Promise<Result<MultipartUpload, StorageError>>;

  uploadPart(
    uploadId: string,
    partNumber: number,
    body: Uint8Array | Buffer,
  ): Promise<Result<UploadPart, StorageError>>;

  complete(
    uploadId: string,
    parts: readonly UploadPart[],
  ): Promise<Result<StoredObject, StorageError>>;

  abort(uploadId: string): Promise<Result<void, StorageError>>;

  listParts(uploadId: string): Promise<Result<readonly UploadPart[], StorageError>>;
}

interface InMemoryMultipartEntry {
  readonly upload: MultipartUpload;
  readonly options: MultipartUploadOptions;
  readonly parts: Map<number, { etag: string; size: number; body: Uint8Array }>;
}

export class InMemoryMultipartManager implements MultipartUploadManager {
  private readonly uploads = new Map<string, InMemoryMultipartEntry>();
  private readonly completed = new Map<string, StoredObject>();
  private counter = 0;

  async initiate(
    key: string,
    options: MultipartUploadOptions = {},
  ): Promise<Result<MultipartUpload, StorageError>> {
    const uploadId = `mpu-${++this.counter}-${Date.now()}`;
    const upload: MultipartUpload = { uploadId, key, createdAt: new Date() };
    this.uploads.set(uploadId, { upload, options, parts: new Map() });
    return ok(upload);
  }

  async uploadPart(
    uploadId: string,
    partNumber: number,
    body: Uint8Array | Buffer,
  ): Promise<Result<UploadPart, StorageError>> {
    const entry = this.uploads.get(uploadId);
    if (entry === undefined) {
      return err(multipartFailedError(uploadId, new Error("Upload not found")));
    }
    try {
      const bytes = Buffer.isBuffer(body) ? new Uint8Array(body) : body;
      const etag = await sha256Hex(bytes);
      entry.parts.set(partNumber, { etag, size: bytes.byteLength, body: bytes });
      return ok({ partNumber, etag, size: bytes.byteLength });
    } catch (cause) {
      return err(multipartFailedError(uploadId, cause));
    }
  }

  async complete(
    uploadId: string,
    parts: readonly UploadPart[],
  ): Promise<Result<StoredObject, StorageError>> {
    const entry = this.uploads.get(uploadId);
    if (entry === undefined) {
      return err(multipartFailedError(uploadId, new Error("Upload not found")));
    }
    try {
      const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
      const chunks: Uint8Array[] = [];
      for (const part of sorted) {
        const stored = entry.parts.get(part.partNumber);
        if (stored === undefined) {
          return err(multipartFailedError(uploadId, new Error(`Part ${part.partNumber} missing`)));
        }
        chunks.push(stored.body);
      }
      const totalSize = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const etag = await sha256Hex(merged);
      const object = makeStoredObject(
        entry.upload.key,
        totalSize,
        etag,
        entry.options.contentType ?? "application/octet-stream",
        entry.options.metadata ?? {},
        new Date(),
      );
      this.completed.set(entry.upload.key, object);
      this.uploads.delete(uploadId);
      return ok(object);
    } catch (cause) {
      return err(multipartFailedError(uploadId, cause));
    }
  }

  async abort(uploadId: string): Promise<Result<void, StorageError>> {
    this.uploads.delete(uploadId);
    return ok(undefined);
  }

  async listParts(uploadId: string): Promise<Result<readonly UploadPart[], StorageError>> {
    const entry = this.uploads.get(uploadId);
    if (entry === undefined) {
      return err(multipartFailedError(uploadId, new Error("Upload not found")));
    }
    const parts: UploadPart[] = Array.from(entry.parts.entries())
      .sort(([a], [b]) => a - b)
      .map(([partNumber, p]) => ({ partNumber, etag: p.etag, size: p.size }));
    return ok(parts);
  }

  getCompletedObject(key: string): StoredObject | undefined {
    return this.completed.get(key);
  }
}
