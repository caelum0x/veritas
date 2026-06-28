// Model registry: maps quality tiers and model IDs to provider instances
import type { VerifierLLM } from "@veritas/llm";
import type { QualityTier } from "./types.js";

/** An entry in the model registry */
export interface ModelEntry {
  readonly provider: VerifierLLM;
  readonly modelId: string;
  readonly tier: QualityTier;
  readonly supportsWebSearch: boolean;
  /** Cost per 1M input tokens in USD */
  readonly inputCostPerMillion: number;
  /** Cost per 1M output tokens in USD */
  readonly outputCostPerMillion: number;
}

/** Registry mapping tier -> list of model entries (ordered by preference) */
export class ModelRegistry {
  private readonly entries: ModelEntry[] = [];

  /** Add a model entry to the registry */
  register(entry: ModelEntry): this {
    this.entries.push(entry);
    return this;
  }

  /** Return all entries for a given quality tier */
  byTier(tier: QualityTier): ReadonlyArray<ModelEntry> {
    return this.entries.filter((e) => e.tier === tier);
  }

  /** Return all entries that support web search */
  withWebSearch(): ReadonlyArray<ModelEntry> {
    return this.entries.filter((e) => e.supportsWebSearch);
  }

  /** Return all entries, ordered by ascending cost */
  byCostAscending(): ReadonlyArray<ModelEntry> {
    return [...this.entries].sort(
      (a, b) => a.inputCostPerMillion - b.inputCostPerMillion,
    );
  }

  /** Return the full entry list (immutable snapshot) */
  all(): ReadonlyArray<ModelEntry> {
    return [...this.entries];
  }

  /** Look up a specific entry by provider name + model ID */
  find(providerName: string, modelId: string): ModelEntry | undefined {
    return this.entries.find(
      (e) => e.provider.name === providerName && e.modelId === modelId,
    );
  }
}

/** Build the default registry pre-populated with known Anthropic models */
export function buildDefaultRegistry(
  anthropicProvider: VerifierLLM,
): ModelRegistry {
  const registry = new ModelRegistry();

  registry.register({
    provider: anthropicProvider,
    modelId: "claude-haiku-4-5",
    tier: "economy",
    supportsWebSearch: false,
    inputCostPerMillion: 0.8,
    outputCostPerMillion: 4.0,
  });

  registry.register({
    provider: anthropicProvider,
    modelId: "claude-sonnet-4-6",
    tier: "balanced",
    supportsWebSearch: true,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  });

  registry.register({
    provider: anthropicProvider,
    modelId: "claude-opus-4-5",
    tier: "premium",
    supportsWebSearch: true,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
  });

  return registry;
}
