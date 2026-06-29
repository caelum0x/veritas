// Provider registry for llm-providers: register, select, and query VerifierLLM adapters
import { ok, err, type Result } from "@veritas/core";
import { InternalError, type AppError } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import type { ProviderCapabilities } from "./capabilities.js";

/** Metadata stored alongside each registered provider */
export interface ProviderRegistryEntry {
  readonly provider: VerifierLLM;
  readonly capabilities: ProviderCapabilities;
  readonly isDefault: boolean;
}

/** Criteria for selecting a provider from the registry */
export interface LLMProviderSelectionCriteria {
  readonly preferredName?: string;
  readonly requiresWebSearch?: boolean;
  readonly requiresStreaming?: boolean;
  readonly requiresFunctionCalling?: boolean;
}

/** Registry of VerifierLLM adapters with capability-aware selection */
export class LLMProviderRegistry {
  private readonly entries = new Map<string, ProviderRegistryEntry>();

  /**
   * Register a provider with its capabilities.
   * Setting isDefault=true clears the previous default.
   */
  register(
    provider: VerifierLLM,
    capabilities: ProviderCapabilities,
    isDefault = false,
  ): this {
    if (isDefault) {
      for (const [name, entry] of this.entries) {
        if (entry.isDefault) {
          this.entries.set(name, { ...entry, isDefault: false });
        }
      }
    }
    this.entries.set(provider.name, { provider, capabilities, isDefault });
    return this;
  }

  /** Remove a provider by name; returns true if found */
  unregister(name: string): boolean {
    return this.entries.delete(name);
  }

  /** All registered provider names */
  listNames(): ReadonlyArray<string> {
    return [...this.entries.keys()];
  }

  /** Raw entry lookup */
  getEntry(name: string): ProviderRegistryEntry | undefined {
    return this.entries.get(name);
  }

  /** Provider lookup without capabilities */
  get(name: string): VerifierLLM | undefined {
    return this.entries.get(name)?.provider;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  /**
   * Select the best matching provider.
   * Priority: preferredName → capability match → default → first.
   */
  select(criteria: LLMProviderSelectionCriteria = {}): Result<VerifierLLM, AppError> {
    const { preferredName, requiresWebSearch, requiresStreaming, requiresFunctionCalling } =
      criteria;

    if (preferredName) {
      const entry = this.entries.get(preferredName);
      if (entry) {
        const cap = entry.capabilities;
        if (requiresWebSearch && !cap.supportsWebSearch) {
          return err(
            new InternalError({
              message: `Provider "${preferredName}" does not support web search`,
            }),
          );
        }
        if (requiresStreaming && !cap.supportsStreaming) {
          return err(
            new InternalError({
              message: `Provider "${preferredName}" does not support streaming`,
            }),
          );
        }
        if (requiresFunctionCalling && !cap.supportsFunctionCalling) {
          return err(
            new InternalError({
              message: `Provider "${preferredName}" does not support function calling`,
            }),
          );
        }
        return ok(entry.provider);
      }
    }

    // Find first entry satisfying all capability constraints
    for (const entry of this.entries.values()) {
      const cap = entry.capabilities;
      if (requiresWebSearch && !cap.supportsWebSearch) continue;
      if (requiresStreaming && !cap.supportsStreaming) continue;
      if (requiresFunctionCalling && !cap.supportsFunctionCalling) continue;
      return ok(entry.provider);
    }

    if (requiresWebSearch || requiresStreaming || requiresFunctionCalling) {
      return err(
        new InternalError({ message: "No provider satisfying all required capabilities found" }),
      );
    }

    for (const entry of this.entries.values()) {
      if (entry.isDefault) return ok(entry.provider);
    }

    const first = this.entries.values().next().value as ProviderRegistryEntry | undefined;
    if (first) return ok(first.provider);

    return err(new InternalError({ message: "No LLM provider registered" }));
  }
}

/** Module-level singleton */
export const llmProviderRegistry = new LLMProviderRegistry();
