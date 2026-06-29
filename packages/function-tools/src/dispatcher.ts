// Tool call dispatcher: routes incoming tool-call requests to registered handlers.

import { toAppError } from "@veritas/core";
import type { ToolRegistry } from "./registry.js";
import type { ToolResult } from "./result.js";
import { toolFailure } from "./result.js";
import { ToolNotFoundError } from "./errors.js";

/** A raw tool invocation as received from an LLM or agent runtime. */
export interface ToolCall {
  /** Stable identifier assigned by the caller (e.g. Anthropic tool_use id). */
  readonly id: string;
  /** The name of the tool to invoke. */
  readonly name: string;
  /** The raw (unvalidated) input arguments for the tool. */
  readonly input: unknown;
}

/** A ToolResult tagged with the originating call id for correlation. */
export interface DispatchedResult {
  readonly callId: string;
  readonly result: ToolResult;
}

/**
 * Dispatch a single ToolCall through the registry.
 * Returns a DispatchedResult regardless of whether the tool succeeded or failed.
 */
export async function dispatch(
  registry: ToolRegistry,
  call: ToolCall
): Promise<DispatchedResult> {
  const tool = registry.get(call.name);

  if (tool === undefined) {
    return {
      callId: call.id,
      result: toolFailure(call.name, new ToolNotFoundError(call.name)),
    };
  }

  try {
    const result = await tool.handler(call.input);
    return { callId: call.id, result };
  } catch (e) {
    return {
      callId: call.id,
      result: toolFailure(call.name, toAppError(e)),
    };
  }
}

/**
 * Dispatch multiple ToolCalls in parallel through the registry.
 * Results are returned in the same order as the input calls array.
 */
export async function dispatchAll(
  registry: ToolRegistry,
  calls: ReadonlyArray<ToolCall>
): Promise<ReadonlyArray<DispatchedResult>> {
  return Promise.all(calls.map((call) => dispatch(registry, call)));
}
