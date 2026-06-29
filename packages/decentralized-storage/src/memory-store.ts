// In-memory content-addressable store; implements ContentStore for tests and local dev.

import { ok, err, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import { makeCid, isCid } from "./cid.js";
import type { CID } from "./cid.js";
import type { ContentStore, BlobResult, BlobMeta, PutOptions, GetOptions } from "./store.js";
import { notFoundError, invalidCidError } from "./errors.js";
import type { StorageError } from "./errors.js";

interface Entry {
  readonly content: Uint8Array;
  readonly meta: BlobMeta;
}

/** Volatile in-process CAS — data is lost on restart. */
export class MemoryStore implements ContentStore {
  private readonly blobs = new Map<string, Entry>();

  async put(content: Uint8Array, options: PutOptions = {}): Promise<Result<CID, StorageError>> {
    const codec = options.codec ?? "raw";
    const cid = makeCid(content, codec);
    if (!this.blobs.has(cid)) {
      const meta: BlobMeta = {
        cid,
        size: content.byteLength,
        codec,
        storedAt: epochToIso(Date.now()),
      };
      this.blobs.set(cid, { content: Uint8Array.from(content), meta });
    }
    return ok(cid);
  }

  async get(cid: CID, options: GetOptions = {}): Promise<Result<BlobResult, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    const entry = this.blobs.get(cid);
    if (!entry) {
      if (options.allowMissing) {
        // Return a typed error even with allowMissing — caller decides how to handle.
        return err(notFoundError(cid));
      }
      return err(notFoundError(cid));
    }
    return ok({ cid, content: Uint8Array.from(entry.content), meta: entry.meta });
  }

  async has(cid: CID): Promise<Result<boolean, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    return ok(this.blobs.has(cid));
  }

  async delete(cid: CID): Promise<Result<void, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    this.blobs.delete(cid);
    return ok(undefined);
  }

  async list(): Promise<Result<ReadonlyArray<BlobMeta>, StorageError>> {
    return ok(Array.from(this.blobs.values()).map((e) => e.meta));
  }

  /** Total number of blobs held in memory. */
  get size(): number {
    return this.blobs.size;
  }
}
