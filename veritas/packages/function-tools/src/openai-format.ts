// OpenAI functions/tools format: serialise FunctionTools and DispatchedResults for the OpenAI API.

import type { FunctionTool } from "./tool.js";
import type { DispatchedResult } from "./dispatcher.js";
import { isToolSuccess } from "./result.js";
import { zodToJsonSchema } from "./schema.js";

/**
 * OpenAI `function` definition nested inside a tool object.
 * Mirrors the shape expected by the OpenAI Chat Completions API.
 */
export interface OpenAiFunctionDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
    readonly [k: string]: unknown;
  };
}

/** OpenAI tool definition wrapping a function. */
export interface OpenAiToolDefinition {
  readonly type: "function";
  readonly function: OpenAiFunctionDefinition;
}

/** OpenAI `tool` role message for returning a tool result. */
export interface OpenAiToolMessage {
  readonly role: "tool";
  readonly tool_call_id: string;
  readonly content: string;
}

/**
 * Convert a FunctionTool into an OpenAI tool definition.
 * The parameters schema is derived from the tool's Zod schema.
 */
export function toOpenAiTool(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: FunctionTool<any>
): OpenAiToolDefinition {
  const jsonSchema = zodToJsonSchema(tool.inputSchema);
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: {},
        ...(jsonSchema as unknown as Record<string, unknown>),
      },
    },
  };
}

/**
 * Convert an array of FunctionTools to OpenAI tool definitions.
 */
export function toOpenAiTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: ReadonlyArray<FunctionTool<any>>
): ReadonlyArray<OpenAiToolDefinition> {
  return tools.map(toOpenAiTool);
}

/**
 * Convert a DispatchedResult to an OpenAI tool role message.
 * Both success and error payloads are serialised to JSON strings in the content field.
 */
export function toOpenAiToolMessage(dispatched: DispatchedResult): OpenAiToolMessage {
  const { callId, result } = dispatched;

  if (isToolSuccess(result)) {
    return {
      role: "tool",
      tool_call_id: callId,
      content: JSON.stringify(result.data),
    };
  }

  return {
    role: "tool",
    tool_call_id: callId,
    content: JSON.stringify({ error: result.error.message, code: result.error.code }),
  };
}

/**
 * Convert multiple DispatchedResults to OpenAI tool role messages.
 */
export function toOpenAiToolMessages(
  dispatched: ReadonlyArray<DispatchedResult>
): ReadonlyArray<OpenAiToolMessage> {
  return dispatched.map(toOpenAiToolMessage);
}
