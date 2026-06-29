// StreamHandler: consumes a ChunkIterator, dispatches typed callbacks, and accumulates the result.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { StreamChunk, TokenChunk, ToolCallChunk, FinishChunk, ErrorChunk } from "./chunk.js";
import type { AccumulatedStream, AccumulatedToolCall, StreamOptions, ChunkHandler } from "./types.js";
import {
  StreamAbortedError,
  StreamLimitExceededError,
  StreamProviderError,
  streamErrorMessage,
} from "./errors.js";

export interface StreamHandlerCallbacks {
  readonly onToken?: ChunkHandler<TokenChunk>;
  readonly onToolCall?: ChunkHandler<ToolCallChunk>;
  readonly onFinish?: ChunkHandler<FinishChunk>;
  readonly onError?: ChunkHandler<ErrorChunk>;
}

interface MutableToolCall {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Drains an AsyncIterableIterator<StreamChunk>, calls per-type callbacks, applies
 * timeout / token-limit guards, and returns an AccumulatedStream Result.
 */
export async function handleStream(
  source: AsyncIterableIterator<StreamChunk>,
  callbacks: StreamHandlerCallbacks = {},
  options: StreamOptions = {},
): Promise<Result<AccumulatedStream>> {
  const { maxTokens, signal, timeoutMs } = options;

  let textParts: string[] = [];
  const toolMap = new Map<number, MutableToolCall>();
  let finishReason: AccumulatedStream["finishReason"] = undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let tokenCount = 0;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();

  // Merge external signal
  if (signal) {
    if (signal.aborted) {
      return err(new StreamAbortedError("AbortSignal already aborted"));
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  if (timeoutMs !== undefined && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    for await (const chunk of source) {
      if (controller.signal.aborted) {
        return err(new StreamAbortedError("Stream timed out or was aborted"));
      }

      switch (chunk.type) {
        case "token": {
          textParts.push(chunk.delta);
          tokenCount += 1;
          if (maxTokens !== undefined && tokenCount > maxTokens) {
            return err(
              new StreamLimitExceededError(
                `Stream exceeded maxTokens limit of ${maxTokens}`,
              ),
            );
          }
          await callbacks.onToken?.(chunk);
          break;
        }

        case "tool_call": {
          const existing = toolMap.get(chunk.index);
          if (existing !== undefined) {
            toolMap.set(chunk.index, {
              ...existing,
              arguments: existing.arguments + chunk.argumentsDelta,
            });
          } else {
            toolMap.set(chunk.index, {
              id: chunk.id,
              name: chunk.name,
              arguments: chunk.argumentsDelta,
            });
          }
          await callbacks.onToolCall?.(chunk);
          break;
        }

        case "finish": {
          finishReason = chunk.reason;
          inputTokens = chunk.inputTokens;
          outputTokens = chunk.outputTokens;
          await callbacks.onFinish?.(chunk);
          break;
        }

        case "error": {
          await callbacks.onError?.(chunk);
          return err(new StreamProviderError(chunk.message));
        }
      }
    }
  } catch (thrown: unknown) {
    if (controller.signal.aborted) {
      return err(new StreamAbortedError("Stream aborted during iteration"));
    }
    return err(
      new StreamProviderError(streamErrorMessage(thrown)),
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  const toolCalls: ReadonlyArray<AccumulatedToolCall> = Array.from(
    toolMap.values(),
  ).map((t) => ({ id: t.id, name: t.name, arguments: t.arguments }));

  return ok({
    text: textParts.join(""),
    toolCalls,
    finishReason,
    inputTokens,
    outputTokens,
  });
}
