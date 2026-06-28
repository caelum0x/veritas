// Public API surface for the @veritas/llm package

// Core provider interface + option types
export type {
  VerifierLLM,
  VerificationCallOptions,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractedClaim,
  ExtractionResult,
} from "./provider.js";

// Shared domain types
export type {
  EvidenceItem,
  ResearchResult,
  ClaimAdjudication,
  TokenUsage,
  CostEstimate,
} from "./types.js";

// Error hierarchy
export {
  LLMRefusalError,
  LLMRateLimitError,
  LLMParseError,
  LLMUnavailableError,
  LLMLocalRateLimitError,
} from "./errors.js";

// Provider registry
export { ProviderRegistry, globalRegistry } from "./registry.js";
export type { ProviderSelectionCriteria } from "./registry.js";

// Fallback provider
export { FallbackProvider } from "./fallback-provider.js";

// Mock provider (for local/dev)
export { MockProvider } from "./mock-provider.js";

// Token accounting
export {
  getPricing,
  estimateCost,
  mergeUsage,
  TokenAccumulator,
  zeroUsage,
} from "./token-accounting.js";
export type { ModelPricing } from "./token-accounting.js";

// Prompt builders
export { buildExtractionPrompt, extractionContext } from "./prompts/extract.js";

// Structured output schemas (Zod + plain JSON Schema)
export {
  EvidenceItemSchema,
  AdjudicationOutputSchema,
  ADJUDICATION_JSON_SCHEMA,
} from "./schemas/adjudication.js";
export type { AdjudicationOutput, EvidenceItemOutput } from "./schemas/adjudication.js";

export {
  ExtractedClaimSchema,
  ExtractionOutputSchema,
  EXTRACTION_JSON_SCHEMA,
} from "./schemas/extraction.js";
export type { ExtractedClaimOutput, ExtractionOutput } from "./schemas/extraction.js";
