// create-message wrapper with pause_turn loop for Anthropic API calls
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.js";
import { LLMUnavailableError } from "../errors.js";
import type { AppError } from "@veritas/core";
import { err, ok } from "@veritas/core";
import type { Result } from "@veritas/core";

export interface CreateMessageParams {
  readonly client: Anthropic;
  readonly model: string;
  readonly system: string;
  readonly messages: ReadonlyArray<MessageParam>;
  readonly tools?: Anthropic.Tool[];
  readonly maxTokens: number;
  readonly thinking?: Anthropic.ThinkingConfigParam;
  readonly maxContinuations?: number;
  readonly signal?: AbortSignal;
}

export interface MessageResult {
  readonly message: Anthropic.Message;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
}

const DEFAULT_MAX_CONTINUATIONS = 5;

/** Build current messages array appending assistant content for continuation */
function buildContinuationMessages(
  original: ReadonlyArray<MessageParam>,
  assistantContent: Anthropic.ContentBlock[],
): MessageParam[] {
  return [
    ...original,
    { role: "assistant" as const, content: assistantContent },
  ];
}

/**
 * Wraps client.messages.create with a pause_turn loop.
 * Handles pause_turn stop reason by re-submitting until end_turn or error.
 */
export async function createMessage(
  params: CreateMessageParams,
): Promise<Result<MessageResult, AppError>> {
  const {
    client,
    model,
    system,
    messages,
    tools,
    maxTokens,
    thinking,
    maxContinuations = DEFAULT_MAX_CONTINUATIONS,
    signal,
  } = params;

  let currentMessages: MessageParam[] = [...messages];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let continuations = 0;
  let lastMessage: Anthropic.Message | null = null;

  while (continuations <= maxContinuations) {
    if (signal?.aborted) {
      return err(
        new LLMUnavailableError("Request aborted by caller", "anthropic"),
      );
    }

    try {
      const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
        model,
        system,
        messages: currentMessages,
        max_tokens: maxTokens,
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(thinking ? { thinking } : {}),
      };

      const message = await client.messages.create(requestParams);

      totalInputTokens += message.usage.input_tokens;
      totalOutputTokens += message.usage.output_tokens;
      lastMessage = message;

      if (message.stop_reason === "pause_turn") {
        continuations += 1;
        currentMessages = buildContinuationMessages(
          currentMessages,
          message.content,
        );
        continue;
      }

      return ok({
        message,
        totalInputTokens,
        totalOutputTokens,
      });
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Unknown Anthropic API error";
      return err(new LLMUnavailableError(msg, "anthropic", cause));
    }
  }

  // Exceeded max continuations — return whatever we have
  if (lastMessage) {
    return ok({
      message: lastMessage,
      totalInputTokens,
      totalOutputTokens,
    });
  }

  return err(
    new LLMUnavailableError(
      `Exceeded maximum continuations (${maxContinuations})`,
      "anthropic",
    ),
  );
}
