// Shared types for @veritas/llm-providers: registry entries, capabilities, cost records
import type { VerifierLLM } from "@veritas/llm";

/** Tier classification used to prefer cheaper providers in failover order */
export type ProviderTier = "primary" | "secondary" | "fallback";

/** Modalities a provider may support */
export type ProviderModality = "text" | "vision" | "audio" | "embeddings";

/** Describes what a registered provider is capable of */
export interface ProviderCapabilities {
  readonly modalities: ReadonlyArray<ProviderModality>;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsVision: boolean;
  readonly supportsCaching: boolean;
}

/** Per-model cost in USD per million tokens */
export interface ModelCostEntry {
  readonly modelId: string;
  readonly providerName: string;
  readonly inputUsdPerMToken: number;
  readonly outputUsdPerMToken: number;
  readonly cacheReadUsdPerMToken: number;
  readonly cacheWriteUsdPerMToken: number;
}

/** Snapshot recorded each time a provider call completes */
export interface ProviderCallRecord {
  readonly providerName: string;
  readonly modelId: string;
  readonly operationKind: "extractClaims" | "research" | "adjudicate";
  readonly durationMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly estimatedCostUsd: number;
  readonly succeededAt: string | null;
  readonly failedAt: string | null;
  readonly errorKind: string | null;
}

/** A registered provider entry held by the registry */
export interface ProviderEntry {
  readonly name: string;
  readonly tier: ProviderTier;
  readonly provider: VerifierLLM;
  readonly capabilities: ProviderCapabilities;
  readonly defaultModelId: string;
}

/** Options passed when registering a new provider */
export interface RegisterProviderOptions {
  readonly tier?: ProviderTier;
  readonly capabilities?: Partial<ProviderCapabilities>;
  readonly defaultModelId?: string;
}

/** Criteria for selecting a provider from the registry */
export interface ProviderSelectionCriteria {
  readonly preferredName?: string;
  readonly requiredModality?: ProviderModality;
  readonly requireStreaming?: boolean;
  readonly requireVision?: boolean;
  readonly requireTools?: boolean;
  readonly maxTier?: ProviderTier;
}

/** Result of a failover attempt sequence */
export interface FailoverResult<T> {
  readonly value: T;
  readonly usedProvider: string;
  readonly attemptsCount: number;
  readonly skippedProviders: ReadonlyArray<string>;
}
