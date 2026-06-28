// Shared domain types for the embeddings package.

import type { Vector } from "./vector.js";

/** A text chunk with positional metadata extracted from a larger document. */
export interface TextChunk {
  readonly id: string;
  readonly text: string;
  readonly index: number;
  readonly startChar: number;
  readonly endChar: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An embedded chunk pairing a TextChunk with its vector representation. */
export interface EmbeddedChunk {
  readonly chunk: TextChunk;
  readonly vector: Vector;
  readonly model: string;
}

/** Options controlling how text is split into chunks. */
export interface ChunkOptions {
  readonly maxTokens: number;
  readonly overlapTokens: number;
  readonly separator?: string;
}

/** Default chunking configuration. */
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = Object.freeze({
  maxTokens: 512,
  overlapTokens: 64,
  separator: "\n\n",
});

/** Request payload for a semantic deduplication pass. */
export interface DedupRequest {
  readonly texts: ReadonlyArray<string>;
  readonly threshold: number;
}

/** Result from a semantic deduplication pass. */
export interface DedupResult {
  readonly unique: ReadonlyArray<string>;
  readonly duplicates: ReadonlyArray<{ readonly original: string; readonly duplicate: string; readonly score: number }>;
}

/** A single indexed claim record stored in the vector index. */
export interface IndexedClaim {
  readonly claimId: string;
  readonly text: string;
  readonly vector: Vector;
  readonly model: string;
  readonly indexedAt: string;
}
