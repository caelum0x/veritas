// A2A protocol error types extending AppError for structured error propagation.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Error raised when an A2A message fails schema validation. */
export class A2AValidationError extends AppError {
  readonly a2aCode = "A2A_VALIDATION_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("VALIDATION", 422, message, opts);
    this.name = "A2AValidationError";
  }
}

/** Error raised when the remote A2A agent is unreachable or times out. */
export class A2ATransportError extends AppError {
  readonly a2aCode = "A2A_TRANSPORT_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("UNAVAILABLE", 503, message, opts);
    this.name = "A2ATransportError";
  }
}

/** Error raised when the requested A2A task is not found. */
export class A2ATaskNotFoundError extends AppError {
  readonly a2aCode = "A2A_TASK_NOT_FOUND" as const;
  constructor(taskId: string, opts?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Task not found: ${taskId}`, opts);
    this.name = "A2ATaskNotFoundError";
  }
}

/** Error raised when the A2A agent card cannot be resolved or is invalid. */
export class A2AAgentCardError extends AppError {
  readonly a2aCode = "A2A_AGENT_CARD_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "A2AAgentCardError";
  }
}

/** Error raised when capability negotiation fails between agents. */
export class A2ANegotiationError extends AppError {
  readonly a2aCode = "A2A_NEGOTIATION_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("CONFLICT", 409, message, opts);
    this.name = "A2ANegotiationError";
  }
}

/** Error raised when bridging between A2A and CAP protocols fails. */
export class A2ACapBridgeError extends AppError {
  readonly a2aCode = "A2A_CAP_BRIDGE_ERROR" as const;
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "A2ACapBridgeError";
  }
}

/** Narrow an unknown thrown value into one of the A2A error types. */
export function isA2AError(
  value: unknown
): value is
  | A2AValidationError
  | A2ATransportError
  | A2ATaskNotFoundError
  | A2AAgentCardError
  | A2ANegotiationError
  | A2ACapBridgeError {
  return (
    value instanceof A2AValidationError ||
    value instanceof A2ATransportError ||
    value instanceof A2ATaskNotFoundError ||
    value instanceof A2AAgentCardError ||
    value instanceof A2ANegotiationError ||
    value instanceof A2ACapBridgeError
  );
}
