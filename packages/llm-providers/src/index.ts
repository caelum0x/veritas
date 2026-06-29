// Public surface of @veritas/llm-providers: adapters, registry, failover, mock, errors, types

// Provider adapter factory
export { createProviderAdapter } from "./provider-adapter.js";
export type {
  VendorExtractFn,
  VendorResearchFn,
  VendorAdjudicateFn,
  VendorFunctions,
} from "./provider-adapter.js";

// Mock LLM (deterministic, no external calls)
export { MockLLM } from "./mock-llm.js";

// Package-level error types
export {
  ProviderCapabilityError,
  AllProvidersExhaustedError,
  ProviderNotFoundError,
  ProviderConfigError,
} from "./errors.js";

// Shared types
export type {
  ProviderTier,
  ProviderModality,
  ProviderCapabilities,
  ModelCostEntry,
  ProviderCallRecord,
  ProviderEntry,
  RegisterProviderOptions,
  ProviderSelectionCriteria,
  FailoverResult,
} from "./types.js";
