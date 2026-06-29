// Accumulates streamed chunks into a complete LLM response with text and tool calls.

import type { TokenStream } from "./stream.js";
import type { FinishReason } from "./chunk.js";

export interface AccumulatedToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: string;
}

export interface AccumulatedResponse {
  readonly text: string;
  readonly toolCalls: ReadonlyArray<AccumulatedToolCall>;
  readonly finishReason: FinishReason | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
}

interface MutableToolCall {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Consumes a TokenStream and accumulates all token/tool_call chunks into a
 * single AccumulatedResponse. Throws if an error chunk is encountered.
 */
export async function accumulate(stream: TokenStream): Promise<AccumulatedResponse> {
  let text = "";
  const toolCallMap = new Map<number, MutableToolCall>();
  let finishReason: FinishReason | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  for await (const chunk of stream) {
    switch (chunk.type) {
      case "token":
        text += chunk.delta;
        break;
      case "tool_call": {
        const existing = toolCallMap.get(chunk.index);
        if (existing) {
          toolCallMap.set(chunk.index, {
            ...existing,
            arguments: existing.arguments + chunk.argumentsDelta,
          });
        } else {
          toolCallMap.set(chunk.index, {
            id: chunk.id,
            name: chunk.name,
            arguments: chunk.argumentsDelta,
          });
        }
        break;
      }
      case "finish":
        finishReason = chunk.reason;
        inputTokens = chunk.inputTokens ?? null;
        outputTokens = chunk.outputTokens ?? null;
        break;
      case "error":
        throw new Error(`Stream error${chunk.code ? ` [${chunk.code}]` : ""}: ${chunk.message}`);
    }
  }

  const toolCalls: AccumulatedToolCall[] = Array.from(toolCallMap.values()).map((tc) => ({
    id: tc.id,
    name: tc.name,
    arguments: tc.arguments,
  }));

  return { text, toolCalls, finishReason, inputTokens, outputTokens };
}
