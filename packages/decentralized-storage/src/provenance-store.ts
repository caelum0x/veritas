// Provenance store: persist and retrieve provenance artifacts (source evidence, verification records) via ContentStore.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ContentStore } from "./store.js";
import type { CID } from "./cid.js";
import type { StorageError } from "./errors.js";
import { encodeError, decodeError } from "./errors.js";
import { encode, decode } from "./codec.js";

/** A provenance artifact payload — arbitrary JSON-serializable record. */
export type ProvenancePayload = Readonly<Record<string, unknown>>;

/** Envelope stored around each provenance payload. */
export interface ProvenanceEnvelope {
  readonly version: 1;
  readonly kind: string;
  readonly storedAt: string; // ISO timestamp
  readonly payload: ProvenancePayload;
}

/** Result of a successful provenance retrieval. */
export interface ProvenanceRecord {
  readonly cid: CID;
  readonly envelope: ProvenanceEnvelope;
}

/** High-level store for provenance artifacts on top of a ContentStore backend. */
export class ProvenanceStore {
  constructor(private readonly store: ContentStore) {}

  /**
   * Persist a provenance payload under a logical kind tag.
   * Returns the CID assigned by the underlying content store.
   */
  async put(
    kind: string,
    payload: ProvenancePayload
  ): Promise<Result<CID, StorageError>> {
    const envelope: ProvenanceEnvelope = {
      version: 1,
      kind,
      storedAt: new Date().toISOString(),
      payload,
    };

    const encoded = encode(envelope, "dag-json");
    if (!encoded.ok) return encoded;

    return this.store.put(encoded.value, { codec: "dag-json", labels: { kind } });
  }

  /**
   * Retrieve a provenance artifact by CID.
   * Returns null (wrapped in ok) when allowMissing is true and CID is absent.
   */
  async get(
    cid: CID,
    allowMissing?: boolean
  ): Promise<Result<ProvenanceRecord | null, StorageError>> {
    const blobResult = await this.store.get(cid, { allowMissing });
    if (!blobResult.ok) return blobResult;

    const blob = blobResult.value;
    if (blob === null) return ok(null);

    const decoded = decode(blob.content, "dag-json");
    if (!decoded.ok) return decoded;

    const envelope = decoded.value.payload as ProvenanceEnvelope;
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      envelope.version !== 1 ||
      typeof envelope.kind !== "string"
    ) {
      return err(decodeError(`Malformed provenance envelope at CID ${cid}`));
    }

    return ok({ cid, envelope });
  }

  /**
   * Check whether a provenance artifact exists for the given CID.
   */
  async has(cid: CID): Promise<Result<boolean, StorageError>> {
    return this.store.has(cid);
  }

  /**
   * Remove a provenance artifact. Idempotent.
   */
  async delete(cid: CID): Promise<Result<void, StorageError>> {
    return this.store.delete(cid);
  }
}
