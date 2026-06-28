// Conversation state: immutable snapshot of an ongoing multi-turn dialogue
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import { ConversationStatusSchema, ConversationMetaSchema, type ConversationMeta } from "./types.js";
import { TurnSchema, type Turn } from "./turn.js";

export const ConversationSchema = z.object({
  id: z.string(),
  status: ConversationStatusSchema,
  turns: z.array(TurnSchema),
  systemPrompt: z.string().optional(),
  meta: ConversationMetaSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export interface CreateConversationInput {
  readonly systemPrompt?: string;
  readonly meta?: ConversationMeta;
}

export function newConversationId(): string {
  return newId("conv");
}

export function createConversation(input: CreateConversationInput = {}): Conversation {
  const now = epochToIso(Date.now());
  return Object.freeze({
    id: newConversationId(),
    status: "active" as const,
    turns: [],
    systemPrompt: input.systemPrompt,
    meta: input.meta,
    createdAt: now,
    updatedAt: now,
  });
}

export function addTurnToConversation(
  conversation: Readonly<Conversation>,
  turn: Turn,
): Conversation {
  return {
    ...conversation,
    turns: [...conversation.turns, turn],
    updatedAt: epochToIso(Date.now()),
  };
}

export function completeConversation(conversation: Readonly<Conversation>): Conversation {
  return {
    ...conversation,
    status: "closed" as const,
    updatedAt: epochToIso(Date.now()),
  };
}

export function abandonConversation(conversation: Readonly<Conversation>): Conversation {
  return {
    ...conversation,
    status: "closed" as const,
    updatedAt: epochToIso(Date.now()),
  };
}

export function setPendingClarification(conversation: Readonly<Conversation>): Conversation {
  return {
    ...conversation,
    status: "pending_clarification" as const,
    updatedAt: epochToIso(Date.now()),
  };
}

export function isActive(conversation: Readonly<Conversation>): boolean {
  return conversation.status === "active" || conversation.status === "pending_clarification";
}

export function getTurnCount(conversation: Readonly<Conversation>): number {
  return conversation.turns.length;
}
