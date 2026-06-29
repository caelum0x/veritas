// Arweave adapter: implements ContentStore against the Arweave permaweb (port/mock pattern).

import { ok, err, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import { makeCid, isCid } from "./cid.js";
import type { CID } from "./cid.js";
import type { ContentStore, BlobResult, BlobMeta, PutOptions, GetOptions } from "./store.js";
import { notFoundError, unavailableError, invalidCidError } from "./errors.js";
import type { StorageError } from "./errors.js";

/** Minimal Arweave HTTP API surface required by this adapter. */
export interface ArweaveHttpClient {
  /** Upload data; resolves to the Arweave tx id. */
  upload(content: Uint8Array, tags?: Record<string, string>): Promise<{ txId: string; size: number }>;
  /** Fetch data by tx id. */
  fetch(txId: string): Promise<Uint8Array>;
  /** Query tx ids for data uploaded by this wallet. */
  listOwned(): Promise<Array<{ txId: string; size: number; timestamp: number }>>;
}

export interface ArweaveAdapterConfig {
  readonly gatewayUrl: string;
}

const DEFAULT_CONFIG: ArweaveAdapterConfig = {
  gatewayUrl: "https://arweave.net",
};

/**
 * ContentStore backed by Arweave permanent storage.
 * An internal CID index maps our CIDs to Arweave tx ids.
 */
export class ArweaveAdapter implements ContentStore {
  private readonly client: ArweaveHttpClient;
  private readonly config: ArweaveAdapterConfig;
  /** CID → Arweave tx id mapping (in-process cache). */
  private readonly cidToTx = new Map<CID, string>();
  /** CID → stored meta. */
  private readonly metaCache = new Map<CID, BlobMeta>();

  constructor(client: ArweaveHttpClient, config: Partial<ArweaveAdapterConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async put(content: Uint8Array, options: PutOptions = {}): Promise<Result<CID, StorageError>> {
    const codec = options.codec ?? "raw";
    const cid = makeCid(content, codec);
    if (this.cidToTx.has(cid)) return ok(cid); // already uploaded
    try {
      const tags: Record<string, string> = { "Content-Type": "application/octet-stream", Codec: codec };
      const { txId } = await this.client.upload(content, tags);
      this.cidToTx.set(cid, txId);
      const meta: BlobMeta = {
        cid,
        size: content.byteLength,
        codec,
        storedAt: epochToIso(Date.now()),
      };
      this.metaCache.set(cid, meta);
      return ok(cid);
    } catch (cause) {
      return err(unavailableError("Arweave upload failed", cause));
    }
  }

  async get(cid: CID, _options: GetOptions = {}): Promise<Result<BlobResult, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    const txId = this.cidToTx.get(cid);
    if (!txId) return err(notFoundError(cid));
    try {
      const content = await this.client.fetch(txId);
      const meta = this.metaCache.get(cid) ?? {
        cid,
        size: content.byteLength,
        codec: "raw",
        storedAt: epochToIso(Date.now()),
      };
      return ok({ cid, content, meta });
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      if (msg.includes("not found") || msg.includes("404")) return err(notFoundError(cid));
      return err(unavailableError("Arweave fetch failed", cause));
    }
  }

  async has(cid: CID): Promise<Result<boolean, StorageError>> {
    if (!isCid(cid)) return err(invalidCidError(cid));
    return ok(this.cidToTx.has(cid));
  }

  async delete(_cid: CID): Promise<Result<void, StorageError>> {
    // Arweave is permanent; deletion is a no-op (we just remove the local index entry).
    if (!isCid(_cid)) return err(invalidCidError(_cid));
    this.cidToTx.delete(_cid);
    this.metaCache.delete(_cid);
    return ok(undefined);
  }

  async list(): Promise<Result<ReadonlyArray<BlobMeta>, StorageError>> {
    try {
      const items = await this.client.listOwned();
      const metas: BlobMeta[] = items.map(({ txId, size, timestamp }) => {
        // Build a synthetic CID if we don't have one indexed yet.
        const knownCid = this.txToCid(txId);
        const cid = knownCid ?? (`bafk:${txId}` as CID);
        return { cid, size, codec: "raw", storedAt: epochToIso(timestamp) };
      });
      return ok(metas);
    } catch (cause) {
      return err(unavailableError("Arweave list failed", cause));
    }
  }

  /** Build a permanent gateway URL for a CID. */
  gatewayUrl(cid: CID): string {
    const txId = this.cidToTx.get(cid) ?? cid;
    return `${this.config.gatewayUrl}/${txId}`;
  }

  private txToCid(txId: string): CID | null {
    for (const [cid, tx] of this.cidToTx) {
      if (tx === txId) return cid;
    }
    return null;
  }
}
