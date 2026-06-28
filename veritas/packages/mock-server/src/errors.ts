// Domain errors for mock-server: no-match, exhausted mock, and registry conflicts.
import { AppError } from "@veritas/core";

export class MockNotFoundError extends AppError {
  constructor(method: string, path: string) {
    super("NOT_FOUND", 404, "No mock matched request", {
      message: `No mock matched ${method} ${path}`,
      details: { method, path },
    });
  }
}

export class MockExhaustedError extends AppError {
  constructor(mockId: string, maxCalls: number) {
    super("CONFLICT", 409, "Mock call limit reached", {
      message: `Mock "${mockId}" has reached its maximum call count of ${maxCalls}`,
      details: { mockId, maxCalls },
    });
  }
}

export class MockAlreadyExistsError extends AppError {
  constructor(mockId: string) {
    super("CONFLICT", 409, "Mock already exists", {
      message: `A mock with id "${mockId}" already exists in the registry`,
      details: { mockId },
    });
  }
}

export class MockValidationError extends AppError {
  constructor(reason: string, field?: string) {
    super("VALIDATION", 422, "Mock definition validation failed", {
      message: `Mock definition validation failed: ${reason}`,
      details: field ? { field } : {},
    });
  }
}

export class ScenarioNotFoundError extends AppError {
  constructor(scenarioId: string) {
    super("NOT_FOUND", 404, "Scenario not found", {
      message: `Scenario "${scenarioId}" does not exist`,
      details: { scenarioId },
    });
  }
}
