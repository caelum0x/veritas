// VerifierRegistry: register, retrieve, and list specialized verifiers by id or domain.

import type { SpecializedVerifier } from "./specialized-verifier.js";

/** Mutable registry that stores verifier instances keyed by their stable id. */
export class VerifierRegistry {
  readonly #byId = new Map<string, SpecializedVerifier>();

  /** Register a verifier; throws if the id is already taken. */
  register(verifier: SpecializedVerifier): void {
    if (this.#byId.has(verifier.id)) {
      throw new Error(`[verifier-kit] Verifier "${verifier.id}" is already registered`);
    }
    this.#byId.set(verifier.id, verifier);
  }

  /** Replace an existing registration (use with care — prefer idempotent register). */
  replace(verifier: SpecializedVerifier): void {
    this.#byId.set(verifier.id, verifier);
  }

  /** Remove a verifier by id; silently no-ops if not present. */
  unregister(id: string): void {
    this.#byId.delete(id);
  }

  /** Retrieve a single verifier by id, or undefined if not found. */
  get(id: string): SpecializedVerifier | undefined {
    return this.#byId.get(id);
  }

  /** Return all registered verifiers as an immutable array. */
  list(): ReadonlyArray<SpecializedVerifier> {
    return [...this.#byId.values()];
  }

  /** Return all verifiers whose domains array includes the given domain. */
  listByDomain(domain: string): ReadonlyArray<SpecializedVerifier> {
    return [...this.#byId.values()].filter((v) => v.domains.includes(domain));
  }

  /** Total number of registered verifiers. */
  get size(): number {
    return this.#byId.size;
  }
}

/** Create a pre-populated registry from an initial set of verifiers. */
export function createRegistry(
  verifiers: ReadonlyArray<SpecializedVerifier> = [],
): VerifierRegistry {
  const registry = new VerifierRegistry();
  for (const v of verifiers) {
    registry.register(v);
  }
  return registry;
}
