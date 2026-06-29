// Conversation manager: orchestrates turn creation, LLM research, and state transitions
import { ok, err, isOk, type Result, type AppError } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import {
  type Conversation,
  createConversation,
  addTurnToConversation,
  completeConversation,
  isActive,
  type CreateConversationInput,
} from "./conversation.js";
import { createTurn } from "./turn.js";
import { buildApiMessages } from "./history.js";
import type { HistoryOptions } from "./history.js";
import type { ConversationStore } from "./store.js";
import { ConversationNotFoundError, ConversationClosedError } from "./errors.js";

export interface ManagerOptions {
  readonly historyOptions?: HistoryOptions;
}

export interface SendMessageInput {
  readonly conversationId: string;
  readonly userMessage: string;
  readonly options?: ManagerOptions;
}

export interface SendMessageResult {
  readonly conversation: Conversation;
  readonly assistantContent: string;
}

export class ConversationManager {
  constructor(
    private readonly store: ConversationStore,
    private readonly llm: VerifierLLM,
  ) {}

  async startConversation(
    input: CreateConversationInput = {},
  ): Promise<Result<Conversation, AppError>> {
    const conversation = createConversation(input);
    const saved = await this.store.save(conversation);
    return ok(saved);
  }

  async sendMessage(
    input: SendMessageInput,
  ): Promise<Result<SendMessageResult, AppError>> {
    const loaded = await this.store.load(input.conversationId);
    if (!loaded) return err(new ConversationNotFoundError(input.conversationId));

    if (!isActive(loaded)) {
      return err(new ConversationClosedError(loaded.id));
    }

    const userTurn = createTurn({ role: "user", content: input.userMessage });
    const withUser = addTurnToConversation(loaded, userTurn);

    const researchResult = await this.llm.research(input.userMessage);

    let assistantContent: string;
    if (isOk(researchResult)) {
      const evidence = researchResult.value.evidence;
      const summaryParts = evidence.slice(0, 3).map((e) => `- ${e.title}: ${e.snippet}`);
      assistantContent =
        summaryParts.length > 0
          ? `Based on my research:\n${summaryParts.join("\n")}`
          : "I could not find supporting evidence for that claim.";
    } else {
      assistantContent = "I was unable to research that at this time.";
    }

    const assistantTurn = createTurn({ role: "assistant", content: assistantContent });
    const updated = addTurnToConversation(withUser, assistantTurn);

    const saved = await this.store.save(updated);
    return ok({ conversation: saved, assistantContent });
  }

  async endConversation(conversationId: string): Promise<Result<Conversation, AppError>> {
    const loaded = await this.store.load(conversationId);
    if (!loaded) return err(new ConversationNotFoundError(conversationId));

    const completed = completeConversation(loaded);
    const saved = await this.store.save(completed);
    return ok(saved);
  }

  async getConversation(conversationId: string): Promise<Result<Conversation, AppError>> {
    const loaded = await this.store.load(conversationId);
    if (!loaded) return err(new ConversationNotFoundError(conversationId));
    return ok(loaded);
  }
}

// Re-export buildApiMessages so callers can access it via manager module
export { buildApiMessages };
