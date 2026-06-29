// ContentStore port: abstract interface for content-addressable blob storage.

import type { Result } from "@veritas/core";
import type { CID } from "./cid.js";
import type { StorageError } from "./errors.js";

/** Metadata returned alongside stored content. */
export interface BlobMeta {
  readonly cid: CID;
  readonly size: number;
  readonly codec: string;
  readonly storedAt: string; // ISO timestamp
}

/** Options when putting content. */
export interface PutOptions {
  /** Override default codec tag embedded in the CID. */
  readonly codec?: "raw" | "dag-json" | "dag-cbor";
  /** Arbitrary key-value labels attached to the blob. */
  readonly labels?: Readonly<Record<string, string>>;
}

/** Options when getting content. */
export interface GetOptions {
  /** If true, return null instead of an error when the CID is not found. */
  readonly allowMissing?: boolean;
}

/** Result of a successful get. */
export interface BlobResult {
  readonly cid: CID;
  readonly content: Uint8Array;
  readonly meta: BlobMeta;
}

/**
 * Port interface that every storage backend must implement.
 * Implementations live in *-adapter files; tests use memory-store.
 */
export interface ContentStore {
  /** Store bytes; returns the computed CID on success. */
  put(content: Uint8Array, options?: PutOptions): Promise<Result<CID, StorageError>>;

  /** Retrieve bytes by CID. */
  get(cid: CID, options?: GetOptions): Promise<Result<BlobResult, StorageError>>;

  /** Check existence without fetching the payload. */
  has(cid: CID): Promise<Result<boolean, StorageError>>;

  /** Remove a blob. Idempotent: missing CID is not an error. */
  delete(cid: CID): Promise<Result<void, StorageError>>;

  /** List CIDs stored in this backend. */
  list(): Promise<Result<ReadonlyArray<BlobMeta>, StorageError>>;
}
