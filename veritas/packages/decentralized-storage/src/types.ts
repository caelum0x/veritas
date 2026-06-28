// Shared domain types for the decentralized-storage package.

import type { CID, Codec } from "./cid.js";

/** Supported storage backend identifiers. */
export type BackendKind = "memory" | "ipfs" | "arweave";

/** Pin status of a blob on a remote backend. */
export type PinStatus = "pinned" | "unpinned" | "queued" | "failed";

/** Metadata describing a pinning record. */
export interface PinRecord {
  readonly cid: CID;
  readonly backend: BackendKind;
  readonly status: PinStatus;
  readonly pinnedAt: string | null; // ISO timestamp or null when not yet pinned
  readonly requestedAt: string;     // ISO timestamp
}

/** A single fixed-size chunk produced by the chunker. */
export interface Chunk {
  readonly index: number;
  readonly cid: CID;
  readonly content: Uint8Array;
  readonly size: number;
}

/** Result of chunking a blob into fixed-size pieces. */
export interface ChunkedBlob {
  readonly rootCid: CID;
  readonly codec: Codec;
  readonly chunks: ReadonlyArray<Chunk>;
  readonly totalSize: number;
}

/** An encoded block ready for storage. */
export interface EncodedBlock {
  readonly cid: CID;
  readonly codec: Codec;
  readonly bytes: Uint8Array;
}

/** Provenance artifact linking a verification result to its stored evidence. */
export interface ProvenanceArtifact {
  readonly id: string;
  readonly verificationId: string;
  readonly cid: CID;
  readonly backend: BackendKind;
  readonly gatewayUrl: string;
  readonly contentSize: number;
  readonly storedAt: string; // ISO timestamp
  readonly labels: Readonly<Record<string, string>>;
}

/** Options for creating a provenance artifact. */
export interface StoreProvenanceOptions {
  readonly verificationId: string;
  readonly backend?: BackendKind;
  readonly labels?: Readonly<Record<string, string>>;
}

/** Configuration options for a storage backend. */
export interface StorageBackendConfig {
  readonly kind: BackendKind;
  /** Base URL of the IPFS/Arweave node (not used for memory). */
  readonly nodeUrl?: string;
  /** API key or JWT token required by the remote backend. */
  readonly apiKey?: string;
  /** Maximum blob size in bytes the backend will accept. */
  readonly maxBlobBytes?: number;
}
