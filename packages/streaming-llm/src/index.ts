// Public surface of @veritas/streaming-llm — re-exports all sub-modules.

export {
  StreamChunkTypeSchema,
  TokenChunkSchema,
  ToolCallChunkSchema,
  FinishReasonSchema,
  FinishChunkSchema,
  ErrorChunkSchema,
  StreamChunkSchema,
  tokenChunk,
  toolCallChunk,
  finishChunk,
  errorChunk,
  type StreamChunkType,
  type TokenChunk,
  type ToolCallChunk,
  type FinishReason,
  type FinishChunk,
  type ErrorChunk,
  type StreamChunk,
} from "./chunk.js";

export type {
  ChunkIterator,
  StreamSource,
  AccumulatedStream,
  AccumulatedToolCall,
  StreamOptions,
  ParsedFragment,
  SseEvent,
  ChunkHandler,
  StreamResult,
  ChunkSink,
} from "./types.js";

export {
  StreamAbortedError,
  StreamLimitExceededError,
  StreamParseError,
  StreamProviderError,
  BackpressureOverflowError,
  streamErrorMessage,
} from "./errors.js";

export { BoundedQueue, createBackpressureSink } from "./backpressure.js";

export { handleStream, type StreamHandlerCallbacks } from "./handler.js";
