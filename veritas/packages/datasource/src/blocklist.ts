// Blocklist: manage a set of explicitly distrusted or banned domains.

import { type Result, ok, err, ValidationError } from "@veritas/core";

/** Reason for blocking a domain. */
export type BlockReason = "spam" | "misinformation" | "phishing" | "parked" | "other";

/** A single blocklist entry. */
export type BlockEntry = Readonly<{
  domain: string;
  reason: BlockReason;
  addedAt: string;
}>;

/** Immutable snapshot of the current blocklist entries. */
export type BlocklistSnapshot = Readonly<{ entries: readonly BlockEntry[] }>;

/** Normalize a domain for storage and lookup. */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").trim();
}

/** Create a Blocklist from an initial set of entries. */
export function createBlocklist(initial: readonly BlockEntry[] = []): Blocklist {
  const map = new Map<string, BlockEntry>(
    initial.map(e => [normalizeDomain(e.domain), { ...e, domain: normalizeDomain(e.domain) }])
  );
  return new Blocklist(map);
}

/** Immutable-style blocklist; all mutations return a new instance. */
export class Blocklist {
  readonly #entries: ReadonlyMap<string, BlockEntry>;

  constructor(entries: ReadonlyMap<string, BlockEntry>) {
    this.#entries = entries;
  }

  /** Return true if the domain is blocked. */
  isBlocked(domain: string): boolean {
    return this.#entries.has(normalizeDomain(domain));
  }

  /** Return the block entry for a domain, or undefined if not blocked. */
  getEntry(domain: string): BlockEntry | undefined {
    return this.#entries.get(normalizeDomain(domain));
  }

  /** Return a new Blocklist with the domain added. */
  add(domain: string, reason: BlockReason): Result<Blocklist> {
    const normalized = normalizeDomain(domain);
    if (normalized === "") {
      return err(new ValidationError({ message: "Domain must not be blank" }));
    }
    const entry: BlockEntry = { domain: normalized, reason, addedAt: new Date().toISOString() };
    const next = new Map<string, BlockEntry>([...this.#entries, [normalized, entry]]);
    return ok(new Blocklist(next));
  }

  /** Return a new Blocklist with the domain removed. */
  remove(domain: string): Blocklist {
    const normalized = normalizeDomain(domain);
    const next = new Map<string, BlockEntry>([...this.#entries]);
    next.delete(normalized);
    return new Blocklist(next);
  }

  /** Snapshot all current block entries. */
  snapshot(): BlocklistSnapshot {
    return { entries: [...this.#entries.values()] };
  }

  /** Number of blocked domains. */
  get size(): number {
    return this.#entries.size;
  }
}
