// Public surface of @veritas/domain-router: re-exports for consumers.
export { run, bootstrap, defaultConfig } from "./main.js";
export type {
  MergedResult,
  VerificationPlan,
  DispatchOutcome,
  DomainRouterConfig,
  DomainRouterDeps,
  DomainRouterWiring,
} from "./main.js";
export { routeClaim } from "./router.js";
export { buildPlan } from "./plan.js";
export { dispatch, successfulOutcomes } from "./dispatch.js";
export { mergeOutcomes } from "./merge.js";
export { runFallback } from "./fallback.js";
export { applyDomainWeights, normaliseWeights, domainWeight } from "./weighting.js";
export {
  RoutingError,
  PlanBuildError,
  DispatchError,
  MergeError,
  FallbackError,
  WeightConfigError,
} from "./errors.js";
