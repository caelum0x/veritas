// Anthropic tool-use format: serialise FunctionTools and DispatchedResults for the Anthropic API.

import type { FunctionTool } from "./tool.js";
import type { DispatchedResult } from "./dispatcher.js";
import { isToolSuccess } from "./result.js";
import { zodToJsonSchema } from "./schema.js";

/**
 * Anthropic Tool definition shape (mirrors Anthropic SDK `Tool`).
 * Defined locally so we do not depend on the SDK type at the boundary.
 */
export interface AnthropicToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input_schema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
    readonly [k: string]: unknown;
  };
}

/** Anthropic `tool_result` content block for a successful tool call. */
export interface AnthropicToolResultSuccess {
  readonly type: "tool_result";
  readonly tool_use_id: string;
  readonly content: string;
}

/** Anthropic `tool_result` content block for a failed tool call. */
export interface AnthropicToolResultError {
  readonly type: "tool_result";
  readonly tool_use_id: string;
  readonly is_error: true;
  readonly content: string;
}

export type AnthropicToolResult = AnthropicToolResultSuccess | AnthropicToolResultError;

/**
 * Convert a FunctionTool into an Anthropic Tool definition.
 * The input_schema is derived from the tool's Zod schema.
 */
export function toAnthropicTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: FunctionTool<any>
): AnthropicToolDefinition {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: {},
      ...(jsonSchema as unknown as Record<string, unknown>),
    },
  };
}

/**
 * Convert an array of FunctionTools to Anthropic Tool definitions.
 */
export function toAnthropicTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: ReadonlyArray<FunctionTool<any>>
): ReadonlyArray<AnthropicToolDefinition> {
  return tools.map(toAnthropicTool);
}

/**
 * Convert a DispatchedResult to an Anthropic `tool_result` content block.
 * Successful results are JSON-serialised; failures produce an error block.
 */
export function toAnthropicToolResult(dispatched: DispatchedResult): AnthropicToolResult {
  const { callId, result } = dispatched;

  if (isToolSuccess(result)) {
    return {
      type: "tool_result",
      tool_use_id: callId,
      content: JSON.stringify(result.data),
    };
  }

  return {
    type: "tool_result",
    tool_use_id: callId,
    is_error: true,
    content: result.error.message,
  };
}

/**
 * Convert multiple DispatchedResults to Anthropic tool_result content blocks.
 */
export function toAnthropicToolResults(
  dispatched: ReadonlyArray<DispatchedResult>
): ReadonlyArray<AnthropicToolResult> {
  return dispatched.map(toAnthropicToolResult);
}
