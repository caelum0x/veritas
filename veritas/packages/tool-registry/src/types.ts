// Shared primitive types used across the tool-registry package.

import { z } from "zod";

/** JSON-serialisable scalar type accepted as a tool parameter value. */
export type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

/** A single named parameter in a tool's input/output schema. */
export interface ToolParam {
  readonly name: string;
  readonly type: ParamType;
  readonly description: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
}

/** Runtime context supplied to the registry when invoking a tool. */
export interface ToolContext {
  readonly requestId: string;
  readonly callerAgentId?: string;
  readonly permissions: ReadonlyArray<string>;
  readonly timeoutMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export const toolParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object", "array", "null"]),
  description: z.string(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
});

export const toolContextSchema = z.object({
  requestId: z.string().min(1),
  callerAgentId: z.string().optional(),
  permissions: z.array(z.string()),
  timeoutMs: z.number().int().positive(),
  metadata: z.record(z.unknown()),
});
