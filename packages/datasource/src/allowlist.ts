// Allowlist: manage a set of explicitly trusted domains with O(1) lookup.

import { type Result, ok, err, ValidationError } from "@veritas/core";

/** Immutable snapshot of the current allowlist. */
export type AllowlistSnapshot = Readonly<{ domains: ReadonlySet<string> }>;

/** Normalize a domain string for storage and lookup. */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

/** Create an allowlist from an initial set of trusted domains. */
export function createAllowlist(initial: readonly string[] = []): Allowlist {
  return new Allowlist(new Set(initial.map(normalizeDomain)));
}

/** Mutable allowlist with immutable-style mutation (returns new instance). */
export class Allowlist {
  readonly #domains: ReadonlySet<string>;

  constructor(domains: ReadonlySet<string>) {
    this.#domains = domains;
  }

  /** Return true if the domain is on the allowlist. */
  isAllowed(domain: string): boolean {
    return this.#domains.has(normalizeDomain(domain));
  }

  /** Return a new Allowlist with the domain added. */
  add(domain: string): Result<Allowlist> {
    const normalized = normalizeDomain(domain);
    if (normalized === "") {
      return err(new ValidationError({ message: "Domain must not be blank" }));
    }
    return ok(new Allowlist(new Set([...this.#domains, normalized])));
  }

  /** Return a new Allowlist with the domain removed. */
  remove(domain: string): Allowlist {
    const normalized = normalizeDomain(domain);
    const next = new Set([...this.#domains]);
    next.delete(normalized);
    return new Allowlist(next);
  }

  /** Snapshot the current set of allowed domains. */
  snapshot(): AllowlistSnapshot {
    return { domains: this.#domains };
  }

  /** Number of domains on the allowlist. */
  get size(): number {
    return this.#domains.size;
  }
}
