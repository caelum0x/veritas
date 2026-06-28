// Track cumulative token usage and compute cost estimates per model
import type { TokenUsage, CostEstimate } from "./types.js";

/** Per-token pricing for a single model (prices in USD per million tokens) */
export interface ModelPricing {
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
  readonly cacheReadPerMillion: number;
  readonly cacheWritePerMillion: number;
}

/** Known model pricing table — values in USD per 1M tokens */
const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "claude-opus-4-5": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  "claude-sonnet-4-5": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
  },
  "claude-haiku-4-5": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
    cacheReadPerMillion: 0.08,
    cacheWritePerMillion: 1.0,
  },
};

/** Fallback pricing when a model ID is unrecognized */
const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
  cacheReadPerMillion: 0.3,
  cacheWritePerMillion: 3.75,
};

/** Return the pricing entry for a model, or the default if not found */
export function getPricing(modelId: string): ModelPricing {
  // Match on prefix so versioned suffixes still resolve (e.g. claude-sonnet-4-5-20251101)
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelId.startsWith(key)) return pricing;
  }
  return DEFAULT_PRICING;
}

/** Compute the USD cost for a set of token usage given a model */
export function estimateCost(usage: TokenUsage, modelId: string): CostEstimate {
  const pricing = getPricing(modelId);
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

/** Merge two TokenUsage snapshots by summing all fields */
export function mergeUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** Accumulates token usage across multiple LLM calls */
export class TokenAccumulator {
  private _usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };

  /** Add a new token usage snapshot to the running total */
  add(usage: TokenUsage): void {
    this._usage = mergeUsage(this._usage, usage);
  }

  /** Current accumulated token usage */
  get usage(): TokenUsage {
    return this._usage;
  }

  /** Total tokens (input + output, excluding cache variants) */
  get totalTokens(): number {
    return this._usage.inputTokens + this._usage.outputTokens;
  }

  /** Compute total cost for all accumulated usage given a model */
  estimateCost(modelId: string): CostEstimate {
    return estimateCost(this._usage, modelId);
  }

  /** Reset accumulator to zero */
  reset(): void {
    this._usage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
}

/** Create a zero-valued TokenUsage snapshot */
export function zeroUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}
