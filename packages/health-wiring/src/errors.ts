// Typed errors for health-wiring: check registration and aggregation failures.
import { AppError } from "@veritas/core";

export class HealthCheckRegistrationError extends AppError {
  constructor(checkName: string, reason: string) {
    super("INTERNAL", 500, `Failed to register health check "${checkName}": ${reason}`);
    this.name = "HealthCheckRegistrationError";
  }
}

export class HealthAggregationError extends AppError {
  constructor(reason: string) {
    super("INTERNAL", 500, `Health aggregation failed: ${reason}`);
    this.name = "HealthAggregationError";
  }
}

export class DependencyCheckError extends AppError {
  constructor(depName: string, reason: string) {
    super("UNAVAILABLE", 503, `Dependency check failed for "${depName}": ${reason}`);
    this.name = "DependencyCheckError";
  }
}
