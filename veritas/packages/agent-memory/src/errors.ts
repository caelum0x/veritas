// Memory-domain error types — AgentMemoryError and typed error codes for the package.

export type AgentMemoryErrorCode =
  | "MEMORY_NOT_FOUND"
  | "MEMORY_STORE_ERROR"
  | "MEMORY_VALIDATION_ERROR"
  | "MEMORY_CAPACITY_EXCEEDED"
  | "EMBEDDING_REQUIRED"
  | "SUMMARIZE_ERROR"
  | "FORGET_ERROR";

export class AgentMemoryError extends Error {
  readonly code: AgentMemoryErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: AgentMemoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "AgentMemoryError";
    this.code = code;
    this.details = details;
  }

  static notFound(id: string): AgentMemoryError {
    return new AgentMemoryError("MEMORY_NOT_FOUND", `Memory not found: ${id}`, { id });
  }

  static storeError(message: string, cause?: unknown): AgentMemoryError {
    return new AgentMemoryError("MEMORY_STORE_ERROR", message, undefined, cause);
  }

  static validation(message: string): AgentMemoryError {
    return new AgentMemoryError("MEMORY_VALIDATION_ERROR", message);
  }

  static capacityExceeded(agentId: string, limit: number): AgentMemoryError {
    return new AgentMemoryError(
      "MEMORY_CAPACITY_EXCEEDED",
      `Memory capacity exceeded for agent ${agentId} (limit: ${limit})`,
      { agentId, limit },
    );
  }

  static embeddingRequired(memoryId: string): AgentMemoryError {
    return new AgentMemoryError(
      "EMBEDDING_REQUIRED",
      `Embedding required for semantic retrieval on memory ${memoryId}`,
      { memoryId },
    );
  }
}
