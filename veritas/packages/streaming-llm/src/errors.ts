// Streaming-specific error types extending AppError from @veritas/core.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Thrown when the upstream LLM stream is aborted (e.g. via AbortSignal or timeout). */
export class StreamAbortedError extends AppError {
  constructor(message = "LLM stream aborted", opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, message, opts ?? {});
    this.name = "StreamAbortedError";
  }
}

/** Thrown when the stream exceeds a token or byte limit. */
export class StreamLimitExceededError extends AppError {
  constructor(
    message = "LLM stream exceeded limit",
    opts?: Partial<AppErrorOptions>,
  ) {
    super("INTERNAL", 500, message, opts ?? {});
    this.name = "StreamLimitExceededError";
  }
}

/** Thrown when a streamed chunk cannot be decoded or parsed. */
export class StreamParseError extends AppError {
  constructor(message = "Failed to parse stream chunk", opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, message, opts ?? {});
    this.name = "StreamParseError";
  }
}

/** Thrown when the LLM provider returns an error event inside the stream. */
export class StreamProviderError extends AppError {
  constructor(message = "LLM provider stream error", opts?: Partial<AppErrorOptions>) {
    super("UNAVAILABLE", 503, message, opts ?? {});
    this.name = "StreamProviderError";
  }
}

/** Thrown when backpressure queue overflows and the consumer is too slow. */
export class BackpressureOverflowError extends AppError {
  constructor(
    message = "Backpressure queue overflow — consumer too slow",
    opts?: Partial<AppErrorOptions>,
  ) {
    super("INTERNAL", 500, message, opts ?? {});
    this.name = "BackpressureOverflowError";
  }
}

/** Narrows an unknown thrown value to a descriptive message string. */
export function streamErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown streaming error";
}
