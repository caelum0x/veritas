// Provider registry: stores and resolves IdpProvider instances by id.

import { ok, err, type Result } from "@veritas/core";
import type { IdpProvider } from "./provider.js";
import { ProviderNotFoundError } from "./errors.js";

/** In-memory registry mapping provider ids to their adapter instances. */
export interface ProviderRegistry {
  /** Register a provider, replacing any existing entry with the same id. */
  register(provider: IdpProvider): void;
  /** Remove a provider from the registry. */
  unregister(providerId: string): void;
  /** Resolve a provider by id, returning ProviderNotFoundError if absent. */
  resolve(providerId: string): Result<IdpProvider, ProviderNotFoundError>;
  /** Return all registered providers. */
  listAll(): readonly IdpProvider[];
  /** Return all registered providers for a given orgId (requires orgId on provider config). */
  listByOrg(orgId: string): readonly IdpProvider[];
}

/** Creates a new in-memory ProviderRegistry. */
export function createProviderRegistry(): ProviderRegistry {
  const providers = new Map<string, IdpProvider>();

  return {
    register(provider: IdpProvider): void {
      providers.set(provider.config.id, provider);
    },

    unregister(providerId: string): void {
      providers.delete(providerId);
    },

    resolve(providerId: string): Result<IdpProvider, ProviderNotFoundError> {
      const provider = providers.get(providerId);
      if (!provider) {
        return err(new ProviderNotFoundError(providerId));
      }
      return ok(provider);
    },

    listAll(): readonly IdpProvider[] {
      return Array.from(providers.values());
    },

    listByOrg(orgId: string): readonly IdpProvider[] {
      return Array.from(providers.values()).filter(
        (p) => (p as unknown as { orgId?: string }).orgId === orgId
      );
    },
  };
}
