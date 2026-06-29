// Provider registry: register, select, and retrieve VerifierLLM implementations
import { AppError, InternalError } from "@veritas/core";
import { err, ok, type Result } from "@veritas/core";
import type { VerifierLLM } from "./provider.js";

/** Criteria used to select a provider from the registry */
export interface ProviderSelectionCriteria {
  /** Preferred provider name; falls back to default if not found */
  readonly preferredName?: string;
  /** Whether web search capability is required */
  readonly requiresWebSearch?: boolean;
}

/** Metadata attached to each registered provider */
interface ProviderEntry {
  readonly provider: VerifierLLM;
  readonly supportsWebSearch: boolean;
  readonly isDefault: boolean;
}

/** Singleton registry of available LLM providers */
export class ProviderRegistry {
  private readonly entries = new Map<string, ProviderEntry>();

  /**
   * Register a provider.
   * @param provider - The provider implementation
   * @param supportsWebSearch - Whether this provider can run web searches
   * @param isDefault - Mark as default fallback when no name is preferred
   */
  register(
    provider: VerifierLLM,
    supportsWebSearch = false,
    isDefault = false,
  ): this {
    if (isDefault) {
      // Clear existing defaults
      for (const [name, entry] of this.entries) {
        if (entry.isDefault) {
          this.entries.set(name, { ...entry, isDefault: false });
        }
      }
    }
    this.entries.set(provider.name, { provider, supportsWebSearch, isDefault });
    return this;
  }

  /** Unregister a provider by name */
  unregister(name: string): boolean {
    return this.entries.delete(name);
  }

  /** Return all registered provider names */
  listNames(): ReadonlyArray<string> {
    return [...this.entries.keys()];
  }

  /**
   * Select the best provider matching the given criteria.
   * Selection order:
   *  1. preferredName match
   *  2. web-search capable provider (if required)
   *  3. default provider
   *  4. first registered provider
   */
  select(
    criteria: ProviderSelectionCriteria = {},
  ): Result<VerifierLLM, AppError> {
    const { preferredName, requiresWebSearch = false } = criteria;

    if (preferredName) {
      const entry = this.entries.get(preferredName);
      if (entry) {
        if (requiresWebSearch && !entry.supportsWebSearch) {
          return err(
            new InternalError({
              message: `Provider "${preferredName}" does not support web search`,
            }),
          );
        }
        return ok(entry.provider);
      }
    }

    if (requiresWebSearch) {
      for (const entry of this.entries.values()) {
        if (entry.supportsWebSearch) return ok(entry.provider);
      }
      return err(new InternalError({ message: "No provider with web search support found" }));
    }

    for (const entry of this.entries.values()) {
      if (entry.isDefault) return ok(entry.provider);
    }

    const first = this.entries.values().next().value;
    if (first) return ok(first.provider);

    return err(new InternalError({ message: "No LLM provider registered" }));
  }

  /** Retrieve a provider by exact name */
  get(name: string): VerifierLLM | undefined {
    return this.entries.get(name)?.provider;
  }

  /** Check whether a provider is registered */
  has(name: string): boolean {
    return this.entries.has(name);
  }
}

/** Module-level singleton registry */
export const globalRegistry = new ProviderRegistry();
