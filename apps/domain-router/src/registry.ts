// Local VerifierRegistry and selectVerifiers — mirrors verifier-kit internals not exported publicly.
import type { SpecializedVerifier, SpecializedVerifiableClaim } from "@veritas/verifier-kit";

/** Options controlling how verifiers are selected for a claim. */
export interface SelectorOptions {
  readonly maxVerifiers?: number;
  readonly restrictToDomains?: ReadonlyArray<string>;
}

/** Registry that stores and retrieves specialized verifiers by id or domain. */
export class VerifierRegistry {
  readonly #byId = new Map<string, SpecializedVerifier>();

  register(verifier: SpecializedVerifier): void {
    if (this.#byId.has(verifier.id)) {
      throw new Error(`[domain-router] Verifier "${verifier.id}" is already registered`);
    }
    this.#byId.set(verifier.id, verifier);
  }

  replace(verifier: SpecializedVerifier): void {
    this.#byId.set(verifier.id, verifier);
  }

  unregister(id: string): void {
    this.#byId.delete(id);
  }

  get(id: string): SpecializedVerifier | undefined {
    return this.#byId.get(id);
  }

  list(): ReadonlyArray<SpecializedVerifier> {
    return [...this.#byId.values()];
  }

  listByDomain(domain: string): ReadonlyArray<SpecializedVerifier> {
    return [...this.#byId.values()].filter((v) => v.domains.includes(domain));
  }

  get size(): number {
    return this.#byId.size;
  }
}

/** Select registered verifiers that can handle the claim, with optional domain filter. */
export function selectVerifiers(
  claim: SpecializedVerifiableClaim,
  registry: VerifierRegistry,
  options: SelectorOptions = {},
): ReadonlyArray<SpecializedVerifier> {
  const { maxVerifiers, restrictToDomains } = options;

  let candidates: ReadonlyArray<SpecializedVerifier> = registry.list();

  if (restrictToDomains != null && restrictToDomains.length > 0) {
    const allowed = new Set(restrictToDomains);
    candidates = candidates.filter((v) => v.domains.some((d) => allowed.has(d)));
  }

  const eligible = candidates.filter((v) => v.canHandle(claim));

  if (maxVerifiers != null && maxVerifiers > 0) {
    return eligible.slice(0, maxVerifiers);
  }

  return eligible;
}
