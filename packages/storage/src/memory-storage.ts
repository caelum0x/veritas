// MemoryStorage — in-memory ObjectStorage implementation for testing and development.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ObjectStorage, PutOptions, GetOptions, ListOptions, ListResult, DeleteOptions } from "./storage.js";
import type { StoredObject } from "./object.js";
import { makeStoredObject } from "./object.js";
import type { StorageError } from "./errors.js";
import {
  notFoundError,
  uploadFailedError,
  downloadFailedError,
  listFailedError,
  copyFailedError,
} from "./errors.js";
import { sha256Hex } from "@veritas/core";

interface MemoryEntry {
  readonly object: StoredObject;
  readonly body: Uint8Array;
}

export class MemoryStorage implements ObjectStorage {
  private readonly store = new Map<string, MemoryEntry>();

  async put(
    key: string,
    body: Uint8Array | Buffer | string,
    options: PutOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    try {
      const bytes =
        typeof body === "string"
          ? new TextEncoder().encode(body)
          : body instanceof Buffer
          ? new Uint8Array(body)
          : body;

      const etag = await sha256Hex(bytes);
      const object = makeStoredObject(
        key,
        bytes.byteLength,
        etag,
        options.contentType ?? "application/octet-stream",
        options.metadata ?? {},
        new Date(),
      );

      this.store.set(key, { object, body: bytes });
      return ok(object);
    } catch (cause) {
      return err(uploadFailedError(key, cause));
    }
  }

  async get(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<{ object: StoredObject; body: Uint8Array }, StorageError>> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return err(notFoundError(key));
    }
    try {
      return ok({ object: entry.object, body: entry.body });
    } catch (cause) {
      return err(downloadFailedError(key, cause));
    }
  }

  async head(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return err(notFoundError(key));
    }
    return ok(entry.object);
  }

  async delete(
    key: string,
    _options: DeleteOptions = {},
  ): Promise<Result<void, StorageError>> {
    this.store.delete(key);
    return ok(undefined);
  }

  async list(options: ListOptions = {}): Promise<Result<ListResult, StorageError>> {
    try {
      const { prefix = "", maxKeys = 1000, continuationToken } = options;
      const allKeys = Array.from(this.store.keys())
        .filter((k) => k.startsWith(prefix))
        .sort();

      const startIdx = continuationToken
        ? allKeys.indexOf(continuationToken) + 1
        : 0;

      const sliced = allKeys.slice(startIdx, startIdx + maxKeys);
      const isTruncated = startIdx + maxKeys < allKeys.length;
      const nextToken = isTruncated ? allKeys[startIdx + maxKeys] : undefined;

      const objects = sliced.map((k) => this.store.get(k)!.object);

      return ok({
        objects,
        nextContinuationToken: nextToken,
        isTruncated,
      });
    } catch (cause) {
      return err(listFailedError(options.prefix, cause));
    }
  }

  async exists(key: string): Promise<Result<boolean, StorageError>> {
    return ok(this.store.has(key));
  }

  async copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<Result<StoredObject, StorageError>> {
    const entry = this.store.get(sourceKey);
    if (entry === undefined) {
      return err(copyFailedError(sourceKey, destinationKey, notFoundError(sourceKey)));
    }
    const newObject = makeStoredObject(
      destinationKey,
      entry.object.size,
      entry.object.etag,
      entry.object.contentType,
      { ...entry.object.metadata },
      new Date(),
    );
    this.store.set(destinationKey, { object: newObject, body: entry.body });
    return ok(newObject);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
