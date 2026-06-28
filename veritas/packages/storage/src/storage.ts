// ObjectStorage interface — abstract blob store operations over any backend.
import type { Result } from "@veritas/core";
import type { StoredObject } from "./object.js";
import type { StorageError } from "./errors.js";

export interface PutOptions {
  readonly contentType?: string;
  readonly metadata?: Record<string, string>;
  readonly cacheControl?: string;
}

export interface GetOptions {
  readonly versionId?: string;
}

export interface ListOptions {
  readonly prefix?: string;
  readonly maxKeys?: number;
  readonly continuationToken?: string;
}

export interface ListResult {
  readonly objects: readonly StoredObject[];
  readonly nextContinuationToken?: string;
  readonly isTruncated: boolean;
}

export interface DeleteOptions {
  readonly versionId?: string;
}

export interface ObjectStorage {
  put(
    key: string,
    body: Uint8Array | Buffer | string,
    options?: PutOptions,
  ): Promise<Result<StoredObject, StorageError>>;

  get(
    key: string,
    options?: GetOptions,
  ): Promise<Result<{ object: StoredObject; body: Uint8Array }, StorageError>>;

  head(
    key: string,
    options?: GetOptions,
  ): Promise<Result<StoredObject, StorageError>>;

  delete(
    key: string,
    options?: DeleteOptions,
  ): Promise<Result<void, StorageError>>;

  list(options?: ListOptions): Promise<Result<ListResult, StorageError>>;

  exists(key: string): Promise<Result<boolean, StorageError>>;

  copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<Result<StoredObject, StorageError>>;
}
