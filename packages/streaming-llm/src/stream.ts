// AsyncIterable token stream abstraction over streamed LLM output chunks.

import type { StreamChunk } from "./chunk.js";

/** An async iterable of StreamChunk values produced by an LLM response stream. */
export type TokenStream = AsyncIterable<StreamChunk>;

/** Adapter that wraps any AsyncIterable<StreamChunk> into a TokenStream. */
export function fromAsyncIterable(source: AsyncIterable<StreamChunk>): TokenStream {
  return source;
}

/**
 * Creates a TokenStream from an array of chunks (useful for testing).
 */
export async function* fromChunks(chunks: ReadonlyArray<StreamChunk>): TokenStream {
  for (const chunk of chunks) {
    yield chunk;
  }
}

/**
 * Maps each chunk in a TokenStream through a transform function,
 * yielding only non-null results.
 */
export async function* mapStream<T>(
  stream: TokenStream,
  fn: (chunk: StreamChunk) => T | null,
): AsyncIterable<T> {
  for await (const chunk of stream) {
    const result = fn(chunk);
    if (result !== null) {
      yield result;
    }
  }
}

/**
 * Filters a TokenStream to only chunks matching a predicate.
 */
export async function* filterStream(
  stream: TokenStream,
  predicate: (chunk: StreamChunk) => boolean,
): TokenStream {
  for await (const chunk of stream) {
    if (predicate(chunk)) {
      yield chunk;
    }
  }
}

/**
 * Runs through a TokenStream and collects all chunks into an array.
 */
export async function collectStream(stream: TokenStream): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}
