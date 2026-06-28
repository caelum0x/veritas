// Shared supplementary types for the conversation package
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";

/** Valid roles for a conversation message turn */
export type MessageRole = "user" | "assistant" | "system";

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);

/** Conversation lifecycle status */
export type ConversationStatus = "active" | "pending_clarification" | "closed";

export const ConversationStatusSchema = z.enum(["active", "pending_clarification", "closed"]);

/** Metadata attached to a conversation */
export type ConversationMeta = Readonly<Record<string, unknown>>;

export const ConversationMetaSchema = z.record(z.unknown());

/** Clarification question status */
export type ClarificationStatus = "pending" | "answered" | "skipped" | "expired";

export const ClarificationStatusSchema = z.enum([
  "pending",
  "answered",
  "skipped",
  "expired",
]);

/** A single message within a turn (lightweight view) */
export interface ConversationMessage {
  readonly role: string;
  readonly content: string;
  readonly timestamp: IsoTimestamp;
}

export const ConversationMessageSchema = z.object({
  role: z.string(),
  content: z.string().min(1),
  timestamp: z.string() as unknown as z.ZodType<IsoTimestamp>,
});

/** Summary produced at the end of a verification dialog */
export interface VerificationSummary {
  readonly claimText: string;
  readonly refinedClaimText: string | null;
  readonly clarificationsResolved: number;
  readonly turnCount: number;
  readonly conclusionMessage: string;
}
