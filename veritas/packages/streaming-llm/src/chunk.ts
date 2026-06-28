// Defines the StreamChunk discriminated union representing a single unit of streamed LLM output.

import { z } from "zod";

export const StreamChunkTypeSchema = z.enum(["token", "tool_call", "finish", "error"]);
export type StreamChunkType = z.infer<typeof StreamChunkTypeSchema>;

export const TokenChunkSchema = z.object({
  type: z.literal("token"),
  delta: z.string(),
  index: z.number().int().nonnegative(),
});
export type TokenChunk = z.infer<typeof TokenChunkSchema>;

export const ToolCallChunkSchema = z.object({
  type: z.literal("tool_call"),
  id: z.string(),
  name: z.string(),
  argumentsDelta: z.string(),
  index: z.number().int().nonnegative(),
});
export type ToolCallChunk = z.infer<typeof ToolCallChunkSchema>;

export const FinishReasonSchema = z.enum(["stop", "length", "tool_use", "content_filter", "error"]);
export type FinishReason = z.infer<typeof FinishReasonSchema>;

export const FinishChunkSchema = z.object({
  type: z.literal("finish"),
  reason: FinishReasonSchema,
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
});
export type FinishChunk = z.infer<typeof FinishChunkSchema>;

export const ErrorChunkSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorChunk = z.infer<typeof ErrorChunkSchema>;

export const StreamChunkSchema = z.discriminatedUnion("type", [
  TokenChunkSchema,
  ToolCallChunkSchema,
  FinishChunkSchema,
  ErrorChunkSchema,
]);
export type StreamChunk = z.infer<typeof StreamChunkSchema>;

export function tokenChunk(delta: string, index: number): TokenChunk {
  return { type: "token", delta, index };
}

export function toolCallChunk(
  id: string,
  name: string,
  argumentsDelta: string,
  index: number,
): ToolCallChunk {
  return { type: "tool_call", id, name, argumentsDelta, index };
}

export function finishChunk(
  reason: FinishReason,
  inputTokens?: number,
  outputTokens?: number,
): FinishChunk {
  return { type: "finish", reason, inputTokens, outputTokens };
}

export function errorChunk(message: string, code?: string): ErrorChunk {
  return { type: "error", message, code };
}
