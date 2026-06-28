// Domain errors for health-aggregation: duplicate registration, unknown checks, policy violations, and history overflow.

export class DuplicateHealthCheckError extends Error {
  readonly name = "DuplicateHealthCheckError";
  constructor(checkName: string) {
    super(`Health check "${checkName}" is already registered`);
  }
}

export class UnknownHealthCheckError extends Error {
  readonly name = "UnknownHealthCheckError";
  constructor(checkName: string) {
    super(`Health check "${checkName}" is not registered`);
  }
}

export class HealthAggregationError extends Error {
  readonly name = "HealthAggregationError";
  constructor(message: string) {
    super(message);
  }
}

export class HealthHistoryCapacityError extends Error {
  readonly name = "HealthHistoryCapacityError";
  constructor(capacity: number) {
    super(`Health history ring buffer capacity must be at least 1, got ${capacity}`);
  }
}

export class InvalidDegradationPolicyError extends Error {
  readonly name = "InvalidDegradationPolicyError";
  constructor(field: string, value: number) {
    super(`Degradation policy field "${field}" must be between 0 and 1, got ${value}`);
  }
}
