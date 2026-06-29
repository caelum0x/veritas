// IPFS adapter: implements ContentStore against an IPFS HTTP API endpoint (port/mock pattern).

import { ok, err, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import { makeCid, isCid, parseCid } from "./cid.js";
import type { CID } from "./cid.js";
import type { ContentStore, BlobResult, BlobMeta, PutOptions, GetOptions } from "./store.js";
import { notFoundError, unavailableError, invalidCidError } from "./errors.js";
import type { StorageError } from "./errors.js";

/** Minimal IPFS HTTP API surface required by this adapter. */
export interface IpfsHttpClient {
  add(content: Uint8Array): Promise<{ cid: string; size: number }>;
  cat(cid: string): Promise<Uint8Array>;
  pin(cid: string): Promise<void>;
  ls(): Promise<Array<{ cid: string; size: number }>>;
  rm(cid: string): Promise<void>;
}

export interface IpfsAdapterConfig {
  readonly gatewayUrl: string;
  readonly pinOnWrite: boolean;
}

const DEFAULT_CONFIG: IpfsAdapterConfig = {
  gatewayUrl: "http://localhost:8080",
  pinOnWrite: true,
};

/** ContentStore backed by an IPFS node via IpfsHttpClient (injected for testability). */
export class IpfsAdapter implements ContentStore {
  private readonly client: IpfsHttpClient;
  private readonly config: IpfsAdapterConfig;

  constructor(client: IpfsHttpClient, config: Partial<IpfsAdapterConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async put(content: Uint8Array, options: PutOptions = {}): Promise<Result<CID, StorageError>> {
    try {
      const { cid: rawCid } = await this.client.add(content);
      if (this.config.pinOnWrite) {
        await this.client.pin(rawCid).catch(() => {
          // Pin failure is non-fatal; data is still stored.
        });
      }
      // Derive our internal CID so we own the format.
      const codec = options.codec ?? "raw";
      const cid = makeCid(content, codec);
      return ok(cid);
    } catch (cause) {
      return err(unavailableError("IPFS add failed", cause));
    }
  }

  async get(cid: CID, _options: GetOptions = {}): Promise<Result<BlobResult, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    try {
      // Map internal CID back to raw IPFS CID (stored externally as the hex portion).
      const content = await this.client.cat(cid);
      const meta: BlobMeta = {
        cid,
        size: content.byteLength,
        codec: "raw",
        storedAt: epochToIso(Date.now()),
      };
      return ok({ cid, content, meta });
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      if (msg.includes("not found") || msg.includes("404")) return err(notFoundError(cid));
      return err(unavailableError("IPFS cat failed", cause));
    }
  }

  async has(cid: CID): Promise<Result<boolean, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    try {
      await this.client.cat(cid);
      return ok(true);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      if (msg.includes("not found") || msg.includes("404")) return ok(false);
      return err(unavailableError("IPFS has check failed", cause));
    }
  }

  async delete(cid: CID): Promise<Result<void, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    try {
      await this.client.rm(cid);
      return ok(undefined);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      if (msg.includes("not found") || msg.includes("404")) return ok(undefined);
      return err(unavailableError("IPFS rm failed", cause));
    }
  }

  async list(): Promise<Result<ReadonlyArray<BlobMeta>, StorageError>> {
    try {
      const items = await this.client.ls();
      const metas: BlobMeta[] = items.map(({ cid: rawCid, size }) => {
        const cid = parseCid(rawCid) ?? (`bafk:${rawCid}` as CID);
        return { cid, size, codec: "raw", storedAt: epochToIso(Date.now()) };
      });
      return ok(metas);
    } catch (cause) {
      return err(unavailableError("IPFS ls failed", cause));
    }
  }

  /** Build a public gateway URL for a CID. */
  gatewayUrl(cid: CID): string {
    return `${this.config.gatewayUrl}/ipfs/${cid}`;
  }
}
