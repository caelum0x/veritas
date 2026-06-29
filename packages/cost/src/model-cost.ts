// LLM/token cost model: computes USDC cost for model inference given token usage
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";

export const ModelTierSchema = z.enum(["micro", "standard", "advanced", "frontier"]);
export type ModelTier = z.infer<typeof ModelTierSchema>;

export const ModelCostConfigSchema = z.object({
  id: z.string(),
  modelId: z.string().min(1),
  tier: ModelTierSchema,
  inputCostPerMillionTokensUsdc: z.number().nonnegative(),
  outputCostPerMillionTokensUsdc: z.number().nonnegative(),
  contextWindowTokens: z.number().int().positive(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});
export type ModelCostConfig = z.infer<typeof ModelCostConfigSchema>;

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface ModelInferenceCost {
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCostUsdc: number;
  readonly outputCostUsdc: number;
  readonly totalCostUsdc: number;
}

export function computeModelCost(config: ModelCostConfig, usage: TokenUsage): ModelInferenceCost {
  const inputCostUsdc = (usage.inputTokens / 1_000_000) * config.inputCostPerMillionTokensUsdc;
  const outputCostUsdc = (usage.outputTokens / 1_000_000) * config.outputCostPerMillionTokensUsdc;
  return {
    modelId: config.modelId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    inputCostUsdc,
    outputCostUsdc,
    totalCostUsdc: inputCostUsdc + outputCostUsdc,
  };
}

export function makeModelCostConfig(
  modelId: string,
  tier: ModelTier,
  inputCostPerMillionTokensUsdc: number,
  outputCostPerMillionTokensUsdc: number,
  contextWindowTokens: number,
  effectiveFrom?: string,
): ModelCostConfig {
  return ModelCostConfigSchema.parse({
    id: newId("mc"),
    modelId,
    tier,
    inputCostPerMillionTokensUsdc,
    outputCostPerMillionTokensUsdc,
    contextWindowTokens,
    effectiveFrom: effectiveFrom ?? epochToIso(Date.now()),
  });
}

export interface ModelCostRepository {
  upsert(config: ModelCostConfig): Promise<ModelCostConfig>;
  findByModelId(modelId: string, asOf?: string): Promise<ModelCostConfig | undefined>;
  listAll(): Promise<ReadonlyArray<ModelCostConfig>>;
}

export class InMemoryModelCostRepository implements ModelCostRepository {
  private readonly store = new Map<string, ModelCostConfig[]>();

  async upsert(config: ModelCostConfig): Promise<ModelCostConfig> {
    const existing = this.store.get(config.modelId) ?? [];
    this.store.set(config.modelId, [...existing, config]);
    return config;
  }

  async findByModelId(modelId: string, asOf?: string): Promise<ModelCostConfig | undefined> {
    const configs = this.store.get(modelId);
    if (!configs || configs.length === 0) return undefined;
    const cutoff = asOf ?? epochToIso(Date.now());
    const active = configs.filter(
      (c) =>
        c.effectiveFrom <= cutoff &&
        (c.effectiveTo === undefined || c.effectiveTo >= cutoff),
    );
    if (active.length === 0) return undefined;
    return active.reduce((latest, c) => (c.effectiveFrom > latest.effectiveFrom ? c : latest));
  }

  async listAll(): Promise<ReadonlyArray<ModelCostConfig>> {
    return Array.from(this.store.values()).flat();
  }
}

// Default pricing catalogue (micro/standard/advanced/frontier illustrative rates)
export const DEFAULT_MODEL_COSTS: ReadonlyArray<Omit<ModelCostConfig, "id" | "effectiveFrom">> = [
  {
    modelId: "haiku-4-5",
    tier: "micro",
    inputCostPerMillionTokensUsdc: 0.8,
    outputCostPerMillionTokensUsdc: 4.0,
    contextWindowTokens: 200_000,
    effectiveTo: undefined,
  },
  {
    modelId: "sonnet-4-6",
    tier: "standard",
    inputCostPerMillionTokensUsdc: 3.0,
    outputCostPerMillionTokensUsdc: 15.0,
    contextWindowTokens: 200_000,
    effectiveTo: undefined,
  },
  {
    modelId: "opus-4-5",
    tier: "frontier",
    inputCostPerMillionTokensUsdc: 15.0,
    outputCostPerMillionTokensUsdc: 75.0,
    contextWindowTokens: 200_000,
    effectiveTo: undefined,
  },
];
