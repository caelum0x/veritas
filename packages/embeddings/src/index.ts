// Public surface of the @veritas/embeddings package.

export type { Vector } from "./vector.js";
export { makeVector, dim, at, toArray, add, scale, magnitude, normalize, dot } from "./vector.js";

export type { VectorRecord, KnnQuery, KnnResult, VectorStore } from "./vector-store.js";

export { MemoryVectorStore } from "./memory-vector-store.js";

export { cosineSimilarity, cosineDistance, dotSimilarity, rankBySimilarity } from "./similarity.js";

export type { EmbedderMeta, Embedder } from "./embedder.js";

export type {
  TextChunk,
  EmbeddedChunk,
  ChunkOptions,
  DedupRequest,
  DedupResult,
  IndexedClaim,
} from "./types.js";
export { DEFAULT_CHUNK_OPTIONS } from "./types.js";

export {
  EmbeddingError,
  DimensionMismatchError,
  VectorStoreError,
  ChunkingError,
  IndexingError,
} from "./errors.js";

export { HashEmbedder } from "./hash-embedder.js";

export { chunkText } from "./chunk.js";

export type { ClaimInput, IndexerOptions } from "./indexer.js";
export { indexClaims, removeClaim } from "./indexer.js";

export type { SemanticQueryOptions, QueryMatch } from "./query.js";
export { semanticQuery } from "./query.js";

export type { DedupOptions } from "./semantic-dedup.js";
export { deduplicateTexts } from "./semantic-dedup.js";
