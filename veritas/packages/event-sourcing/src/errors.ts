// Concurrency and version errors for the event-sourcing package.
import { AppError } from "@veritas/core";

export class ConcurrencyError extends AppError {
  constructor(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    super(
      "INTERNAL",
      409,
      `Concurrency conflict on aggregate ${aggregateId}: expected version ${expectedVersion}, got ${actualVersion}`
    );
    this.name = "ConcurrencyError";
  }
}

export class AggregateNotFoundError extends AppError {
  constructor(aggregateType: string, aggregateId: string) {
    super(
      "NOT_FOUND",
      404,
      `Aggregate ${aggregateType}(${aggregateId}) not found`
    );
    this.name = "AggregateNotFoundError";
  }
}

export class StreamNotFoundError extends AppError {
  constructor(aggregateId: string) {
    super(
      "NOT_FOUND",
      404,
      `Event stream not found for aggregate: ${aggregateId}`
    );
    this.name = "StreamNotFoundError";
  }
}

export class EventDeserializationError extends AppError {
  constructor(eventType: string, cause?: unknown) {
    super(
      "INTERNAL",
      500,
      `Failed to deserialize event of type ${eventType}`,
      { cause: cause instanceof Error ? cause : undefined }
    );
    this.name = "EventDeserializationError";
  }
}

export class UnknownEventTypeError extends AppError {
  constructor(eventType: string) {
    super("INTERNAL", 500, `Unknown event type: ${eventType}`);
    this.name = "UnknownEventTypeError";
  }
}

export class InvalidVersionError extends AppError {
  constructor(message: string) {
    super("INTERNAL", 500, message);
    this.name = "InvalidVersionError";
  }
}
