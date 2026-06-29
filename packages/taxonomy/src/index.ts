// Public API surface for the @veritas/taxonomy package.

// Enums and guards
export { ClaimType, CLAIM_TYPES, isClaimType } from "./claim-type.js";
export { Domain, DOMAINS, isDomain } from "./domain.js";

// Core types
export type {
  ClassificationResult,
  TaxonomyNode,
  VerifierMapping,
  ClassificationContext,
  ClassificationInput,
  ClaimFeatures,
} from "./types.js";
export { ClassificationInputSchema } from "./types.js";

// Errors
export {
  ClassificationError,
  ClassifierParseError,
  UnmappedDomainError,
  TaxonomyNodeNotFoundError,
} from "./errors.js";

// LLM classifier
export { LLMClassifier, MockClassifierLLMPort } from "./llm-classifier.js";
export type { ClassifierLLMPort } from "./llm-classifier.js";

// Registry
export {
  TaxonomyRegistry,
  globalTaxonomyRegistry,
} from "./registry.js";
export type { NodeQueryOptions } from "./registry.js";
