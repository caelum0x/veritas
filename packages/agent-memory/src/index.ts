// Re-exports the full public surface of @veritas/agent-memory.

export {
  MemoryKindSchema,
  MemorySchema,
  CreateMemorySchema,
  withAccess,
  withDecay,
  effectiveImportance,
} from "./memory.js";

export type { MemoryKind, Memory, CreateMemory } from "./memory.js";

export type { MemoryStore, MemoryFilter } from "./store.js";

export type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "./semantic-memory.js";
export { SemanticMemoryStore } from "./semantic-memory.js";

export type { EpisodicMemory, Episode } from "./episodic.js";

export type { WorkingMemory, WorkingMemoryEntry } from "./working-memory.js";

export type { RetrievalOptions, RetrievalResult } from "./retrieval.js";

export type { SummarizeOptions, SummarizeResult } from "./summarize.js";

export type { ForgetOptions, ForgetResult } from "./forget.js";

export type { AgentMemoryError, AgentMemoryErrorCode } from "./errors.js";

export type { AgentMemoryTypes } from "./types.js";
