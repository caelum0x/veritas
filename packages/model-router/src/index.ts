// Public surface of @veritas/model-router
export { ModelRouter } from "./router.js";
export type { ModelRouterOptions } from "./router.js";

export { RoutingPolicy, DEFAULT_POLICY_CONFIG } from "./policy.js";
export type { PolicyConfig } from "./policy.js";

export { getTaskProfile, resolveQualityTier, requiresWebSearch } from "./task-profile.js";
export type { TaskProfile } from "./task-profile.js";

export { CostAwareStrategy } from "./cost-aware.js";
export { QualityAwareStrategy } from "./quality-aware.js";
export { FallbackChainStrategy } from "./fallback-chain.js";
export { ModelSelector } from "./selector.js";
export { ModelRegistry, buildDefaultRegistry } from "./registry.js";
export type { ModelEntry } from "./registry.js";

export { NoModelAvailableError, RoutingPolicyError, FallbackExhaustedError } from "./errors.js";

export type {
  TaskKind,
  QualityTier,
  RoutingTask,
  RoutingDecision,
  RoutingStrategy,
  FallbackEntry,
} from "./types.js";
