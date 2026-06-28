// A2A message: typed envelope for inter-agent communication.

import { z } from "zod";

export const A2AMessageRoleSchema = z.enum(["user", "agent", "system"]);
export type A2AMessageRole = z.infer<typeof A2AMessageRoleSchema>;

export const A2AMessageKindSchema = z.enum([
  "text",
  "tool-call",
  "tool-result",
  "event",
  "error",
]);
export type A2AMessageKind = z.infer<typeof A2AMessageKindSchema>;

export const A2ATextPartSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

export const A2AToolCallPartSchema = z.object({
  kind: z.literal("tool-call"),
  toolCallId: z.string().min(1),
  toolName: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
});

export const A2AToolResultPartSchema = z.object({
  kind: z.literal("tool-result"),
  toolCallId: z.string().min(1),
  output: z.unknown(),
  isError: z.boolean().default(false),
});

export const A2AEventPartSchema = z.object({
  kind: z.literal("event"),
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const A2AErrorPartSchema = z.object({
  kind: z.literal("error"),
  code: z.string().min(1),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const A2AMessagePartSchema = z.discriminatedUnion("kind", [
  A2ATextPartSchema,
  A2AToolCallPartSchema,
  A2AToolResultPartSchema,
  A2AEventPartSchema,
  A2AErrorPartSchema,
]);
export type A2AMessagePart = z.infer<typeof A2AMessagePartSchema>;

export const A2AMessageSchema = z.object({
  /** Unique message id. */
  id: z.string().min(1),
  /** Task this message belongs to. */
  taskId: z.string().min(1),
  /** Conversation thread id (may equal taskId for single-turn). */
  threadId: z.string().min(1),
  /** Who sent this message. */
  role: A2AMessageRoleSchema,
  /** Structured content parts. */
  parts: z.array(A2AMessagePartSchema).min(1),
  /** ISO-8601 creation timestamp. */
  createdAt: z.string().datetime({ offset: true }),
  /** Arbitrary JSON-safe metadata. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type A2AMessage = z.infer<typeof A2AMessageSchema>;

/** Build a simple single-text-part agent message. */
export function makeTextMessage(
  id: string,
  taskId: string,
  threadId: string,
  role: A2AMessageRole,
  text: string,
  createdAt: string
): A2AMessage {
  return {
    id,
    taskId,
    threadId,
    role,
    parts: [{ kind: "text", text }],
    createdAt,
  };
}
