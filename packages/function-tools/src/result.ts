// Tool call result: typed container for function-tool execution output.

import type { AppError } from "@veritas/core";

/** Successful tool result carrying a JSON-serialisable payload. */
export interface ToolSuccess {
  readonly ok: true;
  readonly toolName: string;
  /** The data returned by the tool handler. Must be JSON-serialisable. */
  readonly data: unknown;
}

/** Failed tool result carrying a structured error. */
export interface ToolFailure {
  readonly ok: false;
  readonly toolName: string;
  readonly error: AppError;
}

/** Discriminated union for the result of a function-tool invocation. */
export type ToolResult = ToolSuccess | ToolFailure;

/** Construct a successful ToolResult. */
export function toolSuccess(toolName: string, data: unknown): ToolSuccess {
  return { ok: true, toolName, data };
}

/** Construct a failed ToolResult. */
export function toolFailure(toolName: string, error: AppError): ToolFailure {
  return { ok: false, toolName, error };
}

/** Narrow a ToolResult to ToolSuccess. */
export function isToolSuccess(r: ToolResult): r is ToolSuccess {
  return r.ok === true;
}

/** Narrow a ToolResult to ToolFailure. */
export function isToolFailure(r: ToolResult): r is ToolFailure {
  return r.ok === false;
}
