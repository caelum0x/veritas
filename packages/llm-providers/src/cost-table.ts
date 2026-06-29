// Per-provider cost table: USD per 1M tokens for every known model across all adapters
import type { TokenUsage, CostEstimate } from "@veritas/llm";

/** Pricing for a single model in USD per 1M tokens */
export interface ProviderModelPricing {
  readonly provider: string;
  readonly modelId: string;
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
  readonly cacheReadPerMillion: number;
  readonly cacheWritePerMillion: number;
}

/** Complete cost table keyed by canonical model ID prefix */
const COST_TABLE: ReadonlyArray<ProviderModelPricing> = [
  // Anthropic
  {
    provider: "anthropic",
    modelId: "claude-opus-4-5",
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-5",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  {
    provider: "anthropic",
    modelId: "claude-haiku-4-5",
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
    cacheWritePerMillion: 1.0,
  },
  // OpenAI-compat
  {
    provider: "openai-compat",
    modelId: "gpt-4o",
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    cacheReadPerMillion: 1.25,
    cacheWritePerMillion: 0.0,
  },
  {
    provider: "openai-compat",
    modelId: "gpt-4o-mini",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    cacheReadPerMillion: 0.075,
    cacheWritePerMillion: 0.0,
  },
  {
    provider: "openai-compat",
    modelId: "gpt-4-turbo",
    inputPerMillion: 10.0,
    outputPerMillion: 30.0,
    cacheReadPerMillion: 0.0,
    cacheWritePerMillion: 0.0,
  },
  // AWS Bedrock (Claude via Bedrock)
  {
    provider: "bedrock",
    modelId: "anthropic.claude-3-5-sonnet",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  {
    provider: "bedrock",
    modelId: "anthropic.claude-3-haiku",
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
    cacheWritePerMillion: 1.0,
  },
  // Vertex AI (Gemini)
  {
    provider: "vertex",
    modelId: "gemini-1.5-pro",
    inputPerMillion: 3.5,
    outputPerMillion: 10.5,
    cacheReadPerMillion: 0.875,
    cacheWritePerMillion: 0.0,
  },
  {
    provider: "vertex",
    modelId: "gemini-1.5-flash",
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
    cacheReadPerMillion: 0.01875,
    cacheWritePerMillion: 0.0,
  },
  // Local / mock — zero cost
  {
    provider: "local",
    modelId: "local",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    cacheReadPerMillion: 0.0,
    cacheWritePerMillion: 0.0,
  },
  {
    provider: "mock",
    modelId: "mock",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
    cacheReadPerMillion: 0.0,
    cacheWritePerMillion: 0.0,
  },
];

/** Default pricing (Sonnet-class) when model is unrecognised */
const FALLBACK_PRICING: ProviderModelPricing = {
  provider: "unknown",
  modelId: "unknown",
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
  cacheReadPerMillion: 0.3,
  cacheWritePerMillion: 3.75,
};

/** Lookup pricing by model ID prefix match, returning fallback if not found */
export function lookupPricing(modelId: string): ProviderModelPricing {
  for (const entry of COST_TABLE) {
    if (modelId.startsWith(entry.modelId)) return entry;
  }
  return FALLBACK_PRICING;
}

/** Compute cost estimate in USD from token usage and model ID */
export function computeCost(usage: TokenUsage, modelId: string): CostEstimate {
  const pricing = lookupPricing(modelId);
  const M = 1_000_000;

  const inputCostUsd =
    (usage.inputTokens / M) * pricing.inputPerMillion +
    (usage.cacheReadTokens / M) * pricing.cacheReadPerMillion +
    (usage.cacheWriteTokens / M) * pricing.cacheWritePerMillion;

  const outputCostUsd = (usage.outputTokens / M) * pricing.outputPerMillion;

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  };
}

/** All entries in the cost table — useful for admin UIs or auditing */
export function allPricingEntries(): ReadonlyArray<ProviderModelPricing> {
  return COST_TABLE;
}
