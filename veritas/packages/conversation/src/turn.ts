// Conversation turn: a single message within a multi-turn dialogue
import { z } from "zod";
import { newId, epochToIso, type IsoTimestamp } from "@veritas/core";
import { MessageRoleSchema, type MessageRole } from "./types.js";

export const TurnSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type Turn = z.infer<typeof TurnSchema>;

export interface CreateTurnInput {
  readonly role: MessageRole;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function newTurnId(): string {
  return newId("turn");
}

export function createTurn(input: CreateTurnInput): Turn {
  return Object.freeze({
    id: newTurnId(),
    role: input.role,
    content: input.content,
    createdAt: epochToIso(Date.now()),
    metadata: input.metadata,
  });
}

export function turnToMessage(turn: Turn): { role: MessageRole; content: string } {
  return { role: turn.role, content: turn.content };
}
