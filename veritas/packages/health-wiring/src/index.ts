// Re-exports the full public surface of @veritas/health-wiring.
export { HealthCheckRegistrationError, HealthAggregationError, DependencyCheckError } from "./errors.js";
export type { SubsystemProbe, CheckRegistry } from "./register-checks.js";
export { createCheckRegistry, registerSubsystem, registerAll } from "./register-checks.js";
export { aggregatePlatformHealth, DEFAULT_DEGRADATION_POLICY } from "./aggregate.js";
export type { ReadinessResult, ReadinessPorts } from "./readiness.js";
export { checkReadiness } from "./readiness.js";
export type { LivenessResult, LivenessPorts } from "./liveness.js";
export { checkLiveness } from "./liveness.js";
export type {
  TcpDependencyOptions,
  HttpDependencyOptions,
  CustomDependencyOptions,
} from "./dependency-checks.js";
export {
  httpDependencyProbe,
  customDependencyProbe,
  noopDependencyProbe,
  memoryProbe,
  buildStandardDependencyProbes,
} from "./dependency-checks.js";
