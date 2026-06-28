// Core types and interfaces for the streaming-llm package.

import type { Result } from "@veritas/core";
import type { StreamChunk, FinishReason } from "./chunk.js";

/** Async iterator that yields StreamChunk values from an LLM stream. */
export type ChunkIterator = AsyncIterableIterator<StreamChunk>;

/** A readable async generator of stream chunks. */
export type StreamSource = () => ChunkIterator;

/** Accumulated result of a completed stream. */
export interface AccumulatedStream {
  readonly text: string;
  readonly toolCalls: readonly AccumulatedToolCall[];
  readonly finishReason: FinishReason | undefined;
  readonly inputTokens: number | undefined;
  readonly outputTokens: number | undefined;
}

/** A fully assembled tool call from streamed deltas. */
export interface AccumulatedToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

/** Options controlling stream consumption behavior. */
export interface StreamOptions {
  /** Maximum number of tokens before forcing stop (guard against runaway streams). */
  readonly maxTokens?: number;
  /** Abort signal to cancel in-flight streaming. */
  readonly signal?: AbortSignal;
  /** Timeout in milliseconds before the stream is aborted. */
  readonly timeoutMs?: number;
}

/** A parsed streaming JSON fragment. */
export interface ParsedFragment {
  readonly path: string;
  readonly value: unknown;
}

/** SSE event emitted by a server-sent-events endpoint. */
export interface SseEvent {
  readonly id: string | undefined;
  readonly event: string | undefined;
  readonly data: string;
  readonly retry: number | undefined;
}

/** Callback invoked for each chunk as it arrives. */
export type ChunkHandler<T extends StreamChunk = StreamChunk> = (
  chunk: T,
) => void | Promise<void>;

/** Result of draining an entire stream. */
export type StreamResult = Result<AccumulatedStream>;

/** Backpressure-aware push interface for stream chunks. */
export interface ChunkSink {
  push(chunk: StreamChunk): Promise<void>;
  end(): void;
  error(err: unknown): void;
}
