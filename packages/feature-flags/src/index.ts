// Public surface of @veritas/feature-flags
export type { FeatureFlag, FlagVariant, FlagValueType } from "./flag.js";
export type { FlagProvider } from "./provider.js";
export { MemoryFlagProvider } from "./memory-provider.js";
export { evaluate, evaluateBoolean, evaluateString } from "./evaluator.js";
export type { FlagTargetingRule, FlagRule } from "./flag.js";
export { matchTargetingRule } from "./rules.js";
export { computeBucket, isInRollout } from "./rollout.js";
export type { EvaluationContext } from "./context.js";
export { FlagClient } from "./client.js";
export type { TenantOverride } from "./overrides.js";
export { OverrideStore } from "./overrides.js";
export { FlagRegistry } from "./registry.js";
export {
  FlagNotFoundError,
  FlagEvaluationError,
  InvalidRuleError,
  ProviderError,
  RegistryError,
} from "./errors.js";
