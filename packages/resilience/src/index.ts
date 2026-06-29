// Public surface of @veritas/resilience: circuit breaker, bulkhead, timeout, retry, hedge, rate guard, policy composition.

export { CircuitBreaker } from "./circuit-breaker.js";
export { RateGuard } from "./rate-guard.js";
export { hedge } from "./hedge.js";
export { compose, liftPolicy, identityPolicy } from "./policy.js";
export type { Policy } from "./policy.js";
export { resilient, withResilience } from "./decorators.js";
export type { ResilientOptions } from "./decorators.js";

export {
  BreakerState,
  initialBreakerState,
  recordFailure,
  recordSuccess,
  maybeTransitionToHalfOpen,
} from "./state.js";
export type { BreakerStateData } from "./state.js";

export {
  CircuitOpenError,
  BulkheadFullError,
  TimeoutError,
  RetryBudgetExhaustedError,
  HedgeAllFailedError,
  PolicyCompositionError,
} from "./errors.js";

export type {
  CircuitBreakerOptions,
  BulkheadOptions,
  TimeoutOptions,
  RetryBudgetOptions,
  FallbackOptions,
  HedgeOptions,
  RateGuardOptions,
} from "./types.js";
