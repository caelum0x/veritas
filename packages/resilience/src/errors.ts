// Domain errors for resilience policies (open circuit, bulkhead full, timeout, budget exhausted).
import { UnavailableError, InternalError } from "@veritas/core";

export class CircuitOpenError extends UnavailableError {
  constructor(name: string) {
    super({ message: `Circuit '${name}' is open — calls rejected` });
    this.name = "CircuitOpenError";
  }
}

export class BulkheadFullError extends UnavailableError {
  constructor(name: string) {
    super({ message: `Bulkhead '${name}' is at capacity — call rejected` });
    this.name = "BulkheadFullError";
  }
}

export class TimeoutError extends UnavailableError {
  constructor(timeoutMs: number) {
    super({ message: `Operation timed out after ${timeoutMs}ms` });
    this.name = "TimeoutError";
  }
}

export class RetryBudgetExhaustedError extends UnavailableError {
  constructor(name: string) {
    super({ message: `Retry budget '${name}' exhausted` });
    this.name = "RetryBudgetExhaustedError";
  }
}

export class HedgeAllFailedError extends UnavailableError {
  constructor(attempts: number) {
    super({ message: `All ${attempts} hedged attempts failed` });
    this.name = "HedgeAllFailedError";
  }
}

export class PolicyCompositionError extends InternalError {
  constructor(detail: string) {
    super({ message: `Policy composition error: ${detail}` });
    this.name = "PolicyCompositionError";
  }
}
