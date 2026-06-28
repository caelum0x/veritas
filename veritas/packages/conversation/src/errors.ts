// Conversation-specific error types extending AppError hierarchy
import { AppError, type AppErrorOptions } from "@veritas/core";

export class ConversationNotFoundError extends AppError {
  constructor(conversationId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Conversation not found: ${conversationId}`, {
      ...opts,
      details: { conversationId, ...opts?.details },
    });
    this.name = "ConversationNotFoundError";
  }
}

export class ConversationClosedError extends AppError {
  constructor(conversationId: string, opts?: Partial<AppErrorOptions>) {
    super("CONFLICT", 409, `Conversation is closed: ${conversationId}`, {
      ...opts,
      details: { conversationId, ...opts?.details },
    });
    this.name = "ConversationClosedError";
  }
}

export class TurnLimitExceededError extends AppError {
  constructor(limit: number, opts?: Partial<AppErrorOptions>) {
    super("CONFLICT", 409, `Turn limit of ${limit} exceeded`, {
      ...opts,
      details: { limit, ...opts?.details },
    });
    this.name = "TurnLimitExceededError";
  }
}

export class ClarificationTimeoutError extends AppError {
  constructor(questionId: string, opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, `Clarification question timed out: ${questionId}`, {
      ...opts,
      details: { questionId, ...opts?.details },
    });
    this.name = "ClarificationTimeoutError";
  }
}

export class InvalidMessageRoleError extends AppError {
  constructor(role: string, opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 400, `Invalid message role: ${role}`, {
      ...opts,
      details: { role, ...opts?.details },
    });
    this.name = "InvalidMessageRoleError";
  }
}
