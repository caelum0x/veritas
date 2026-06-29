// Messaging-specific error types for the @veritas/messaging package
import { AppError, type AppErrorOptions } from "@veritas/core";

/** Generic messaging error with a stable code and human-readable message. */
export class MessagingError extends AppError {
  constructor(code: string, message: string) {
    super("INTERNAL", 500, message, { details: { messagingCode: code } });
    this.name = "MessagingError";
  }
}

export class MessageNotFoundError extends AppError {
  constructor(messageId: string) {
    super("NOT_FOUND", 404, `Message not found: ${messageId}`, {
      details: { messageId },
    });
  }
}

export class MessageSerializationError extends AppError {
  constructor(cause: unknown) {
    super("INTERNAL", 500, "Failed to serialize or deserialize message", {
      details: { cause: String(cause) },
    });
  }
}

export class TopicNotFoundError extends AppError {
  constructor(topic: string) {
    super("NOT_FOUND", 404, `Topic not found: ${topic}`, {
      details: { topic },
    });
  }
}

export class DeadLetterError extends AppError {
  constructor(messageId: string, reason: string) {
    super("INTERNAL", 500, `Message moved to dead letter queue: ${messageId}`, {
      details: { messageId, reason },
    });
  }
}

export class DuplicateMessageError extends AppError {
  constructor(messageId: string) {
    super("CONFLICT", 409, `Duplicate message detected: ${messageId}`, {
      details: { messageId },
    });
  }
}

export class TransportError extends AppError {
  constructor(message: string, cause?: unknown) {
    const opts: AppErrorOptions = cause !== undefined
      ? { details: { cause: String(cause) } }
      : {};
    super("UNAVAILABLE", 503, message, opts);
  }
}

export class HandlerError extends AppError {
  constructor(topic: string, cause: unknown) {
    super("INTERNAL", 500, `Handler failed for topic: ${topic}`, {
      details: { topic, cause: String(cause) },
    });
  }
}
