// Multi-turn verification dialog: orchestrates claim refinement via clarifying questions
import { ok, err, type Result } from "@veritas/core";
import { InternalError, ValidationError } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import {
  type Conversation,
  createConversation,
  addTurnToConversation,
  completeConversation,
  isActive,
} from "./conversation.js";
import { createTurn } from "./turn.js";
import type { ConversationStore } from "./store.js";
import {
  createClarification,
  answerClarification,
  skipClarification,
  allResolved,
  pendingQuestions,
  type ClarificationQuestion,
} from "./clarification.js";
import type { VerificationSummary } from "./types.js";
import { TurnLimitExceededError, ConversationClosedError } from "./errors.js";

const DEFAULT_MAX_TURNS = 20;
const DEFAULT_SYSTEM_PROMPT =
  "You are a fact-verification assistant. Help the user clarify and refine their claim before verification begins.";

export interface VerificationDialogOptions {
  readonly maxTurns?: number;
  readonly systemPrompt?: string;
}

export interface VerificationDialogState {
  readonly conversation: Conversation;
  readonly claimText: string;
  readonly clarifications: ReadonlyArray<ClarificationQuestion>;
  readonly turnCount: number;
  readonly maxTurns: number;
}

export interface StartDialogInput {
  readonly claimText: string;
  readonly options?: VerificationDialogOptions;
}

export interface StartDialogResult {
  readonly state: VerificationDialogState;
  readonly assistantMessage: string;
}

export interface RespondInput {
  readonly conversationId: string;
  readonly userMessage: string;
  readonly questionId?: string;
}

export interface RespondResult {
  readonly state: VerificationDialogState;
  readonly assistantMessage: string;
  readonly complete: boolean;
}

/** Registry of in-progress dialog states keyed by conversationId */
const _dialogStates = new Map<string, VerificationDialogState>();

/** Start a new multi-turn verification dialog for a claim */
export async function startVerificationDialog(
  store: ConversationStore,
  llm: VerifierLLM,
  input: StartDialogInput,
): Promise<Result<StartDialogResult, AppError>> {
  if (!input.claimText.trim()) {
    return err(new ValidationError({ message: "claimText must not be blank" }));
  }

  const maxTurns = input.options?.maxTurns ?? DEFAULT_MAX_TURNS;
  const systemPrompt = input.options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  const conversation = createConversation({ systemPrompt, meta: { claimText: input.claimText } });

  // Generate initial clarification questions via LLM research
  const researchResult = await llm.research(input.claimText);

  let assistantMessage: string;
  const initialClarifications: ClarificationQuestion[] = [];

  if (researchResult.ok) {
    const evidence = researchResult.value.evidence;
    const hasEvidence = evidence.length > 0;
    assistantMessage = hasEvidence
      ? `I found some initial information about your claim. Before I proceed with full verification, I have a few clarifying questions:\n\n1. Can you provide the source or context for this claim?\n2. What time period does this claim refer to?\n3. Are there any specific aspects of the claim you'd like me to focus on?`
      : `I'll help verify your claim: "${input.claimText}". Could you provide more context or specify the source of this claim?`;

    const questionTexts = [
      { text: "Can you provide the source or context for this claim?", rationale: "Source attribution improves verification accuracy" },
      { text: "What time period does this claim refer to?", rationale: "Temporal scope helps narrow evidence search" },
      { text: "Are there specific aspects of the claim you'd like prioritized?", rationale: "Focus areas guide the verification strategy" },
    ];

    for (const q of questionTexts) {
      const result = createClarification({ questionText: q.text, rationale: q.rationale });
      if (result.ok) {
        initialClarifications.push(result.value);
      }
    }
  } else {
    assistantMessage = `I'll help verify your claim: "${input.claimText}". Could you provide more context about the source of this claim?`;
    const clarResult = createClarification({
      questionText: "Could you provide the source or context for this claim?",
      rationale: "Context improves verification accuracy",
    });
    if (clarResult.ok) {
      initialClarifications.push(clarResult.value);
    }
  }

  const assistantTurn = createTurn({ role: "assistant", content: assistantMessage });
  const updatedConversation = addTurnToConversation(conversation, assistantTurn);
  await store.save(updatedConversation);

  const state: VerificationDialogState = {
    conversation: updatedConversation,
    claimText: input.claimText,
    clarifications: initialClarifications,
    turnCount: 1,
    maxTurns,
  };

  _dialogStates.set(updatedConversation.id, state);

  return ok({ state, assistantMessage });
}

/** Send a user response within an active verification dialog */
export async function respondToDialog(
  store: ConversationStore,
  llm: VerifierLLM,
  input: RespondInput,
): Promise<Result<RespondResult, AppError>> {
  const loaded = await store.load(input.conversationId);
  if (!loaded) {
    return err(new InternalError({ message: `Conversation not found: ${input.conversationId}` }));
  }

  if (!isActive(loaded)) {
    return err(new ConversationClosedError(input.conversationId));
  }

  const currentState = _dialogStates.get(input.conversationId);
  if (!currentState) {
    return err(new InternalError({ message: `Dialog state not found for: ${input.conversationId}` }));
  }

  if (currentState.turnCount >= currentState.maxTurns) {
    return err(new TurnLimitExceededError(currentState.maxTurns));
  }

  const userTurn = createTurn({ role: "user", content: input.userMessage });
  const withUser = addTurnToConversation(loaded, userTurn);

  // Update clarification if a specific question was answered
  let updatedClarifications = currentState.clarifications;
  if (input.questionId) {
    updatedClarifications = updatedClarifications.map((q) => {
      if (q.id === input.questionId && q.status === "pending") {
        const result = answerClarification(q, input.userMessage);
        return result.ok ? result.value : q;
      }
      return q;
    });
  } else {
    // Auto-answer the first pending question with the user's response
    let answered = false;
    updatedClarifications = updatedClarifications.map((q) => {
      if (!answered && q.status === "pending") {
        const result = answerClarification(q, input.userMessage);
        if (result.ok) {
          answered = true;
          return result.value;
        }
      }
      return q;
    });
  }

  const pending = pendingQuestions(updatedClarifications);
  const isComplete = allResolved(updatedClarifications) || pending.length === 0;

  let assistantMessage: string;
  let finalConversation = withUser;

  if (isComplete) {
    assistantMessage =
      "Thank you for providing all the necessary context. I now have enough information to proceed with the full verification of your claim. The verification process will begin shortly.";
    finalConversation = completeConversation(withUser);
  } else {
    const nextQuestion = pending[0];
    assistantMessage = nextQuestion
      ? `Thank you for that information. ${nextQuestion.questionText}`
      : "Thank you. I'm now ready to proceed with verification.";
  }

  const assistantTurn = createTurn({ role: "assistant", content: assistantMessage });
  finalConversation = addTurnToConversation(finalConversation, assistantTurn);
  await store.save(finalConversation);

  const newState: VerificationDialogState = {
    ...currentState,
    conversation: finalConversation,
    clarifications: updatedClarifications,
    turnCount: currentState.turnCount + 1,
  };

  _dialogStates.set(input.conversationId, newState);

  return ok({ state: newState, assistantMessage, complete: isComplete });
}

/** Build a summary of the completed verification dialog */
export function buildVerificationSummary(
  state: VerificationDialogState,
): VerificationSummary {
  const answered = state.clarifications.filter((q) => q.status === "answered");
  const refinedParts = answered.map((q) => q.answer).filter((a): a is string => a !== null);
  const refinedClaimText =
    refinedParts.length > 0 ? `${state.claimText} (Context: ${refinedParts.join("; ")})` : null;

  return {
    claimText: state.claimText,
    refinedClaimText,
    clarificationsResolved: answered.length,
    turnCount: state.turnCount,
    conclusionMessage:
      "Verification dialog complete. Proceeding to full fact-check.",
  };
}

/** Skip all remaining pending clarifications and close the dialog */
export async function skipRemainingClarifications(
  store: ConversationStore,
  conversationId: string,
): Promise<Result<VerificationDialogState, AppError>> {
  const loaded = await store.load(conversationId);
  if (!loaded) {
    return err(new InternalError({ message: `Conversation not found: ${conversationId}` }));
  }

  const currentState = _dialogStates.get(conversationId);
  if (!currentState) {
    return err(new InternalError({ message: `Dialog state not found for: ${conversationId}` }));
  }

  const updatedClarifications = currentState.clarifications.map((q) => {
    if (q.status === "pending") {
      const result = skipClarification(q);
      return result.ok ? result.value : q;
    }
    return q;
  });

  const completed = completeConversation(loaded);
  await store.save(completed);

  const newState: VerificationDialogState = {
    ...currentState,
    conversation: completed,
    clarifications: updatedClarifications,
  };

  _dialogStates.set(conversationId, newState);
  return ok(newState);
}
