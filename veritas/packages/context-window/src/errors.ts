// Domain errors for the context-window package.
import { AppError } from "@veritas/core";

export class BudgetExceededError extends AppError {
  constructor(used: number, budget: number) {
    super("INTERNAL", 429, `Token budget exceeded: ${used} > ${budget}`, {
      details: { used, budget },
    });
    this.name = "BudgetExceededError";
  }
}

export class CounterUnavailableError extends AppError {
  constructor(cause?: unknown) {
    super("UNAVAILABLE", 503, "Token counter is unavailable", { cause });
    this.name = "CounterUnavailableError";
  }
}

export class CompactionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, `Compaction failed: ${message}`, { cause });
    this.name = "CompactionError";
  }
}
