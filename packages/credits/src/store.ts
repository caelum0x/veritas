// Credit store: in-memory implementation of the CreditStore port interface.

import { type UserId, type Result, ok } from "@veritas/core";
import { type CreditGrant, type GrantId, isGrantExpired } from "./grant.js";
import { type LedgerEntry, type LedgerEntryKind } from "./ledger.js";
import { type CreditBalance, zeroBalance } from "./balance.js";
import { type CreditStore, type CreditError } from "./types.js";

/** In-memory implementation of CreditStore for testing and development. */
export class InMemoryCreditStore implements CreditStore {
  private readonly grants = new Map<string, CreditGrant>();
  private readonly ledger = new Map<string, LedgerEntry[]>();
  private readonly balances = new Map<string, CreditBalance>();

  async saveGrant(grant: CreditGrant): Promise<Result<CreditGrant, CreditError>> {
    this.grants.set(grant.id as string, grant);
    return ok(grant);
  }

  async findGrant(id: GrantId): Promise<Result<CreditGrant | null, CreditError>> {
    return ok(this.grants.get(id as string) ?? null);
  }

  async findActiveGrants(
    userId: UserId,
    now: string,
  ): Promise<Result<ReadonlyArray<CreditGrant>, CreditError>> {
    const active: CreditGrant[] = [];
    for (const grant of this.grants.values()) {
      if (grant.userId === userId && !isGrantExpired(grant, now) && grant.remaining > 0) {
        active.push(grant);
      }
    }
    // Oldest first: sort by grantedAt ascending.
    active.sort((a, b) => (a.grantedAt < b.grantedAt ? -1 : a.grantedAt > b.grantedAt ? 1 : 0));
    return ok(Object.freeze(active));
  }

  async updateGrant(grant: CreditGrant): Promise<Result<CreditGrant, CreditError>> {
    this.grants.set(grant.id as string, grant);
    return ok(grant);
  }

  async appendLedgerEntry(entry: LedgerEntry): Promise<Result<LedgerEntry, CreditError>> {
    const key = entry.userId as string;
    const existing = this.ledger.get(key) ?? [];
    this.ledger.set(key, [...existing, entry]);
    return ok(entry);
  }

  async findLedgerEntries(
    userId: UserId,
    kind?: LedgerEntryKind,
  ): Promise<Result<ReadonlyArray<LedgerEntry>, CreditError>> {
    const all = this.ledger.get(userId as string) ?? [];
    const filtered = kind ? all.filter((e) => e.kind === kind) : all;
    return ok(Object.freeze(filtered));
  }

  async getBalance(userId: UserId): Promise<Result<CreditBalance | null, CreditError>> {
    return ok(this.balances.get(userId as string) ?? null);
  }

  async saveBalance(balance: CreditBalance): Promise<Result<CreditBalance, CreditError>> {
    this.balances.set(balance.userId as string, balance);
    return ok(balance);
  }
}

/** Build an in-memory store pre-seeded with grants (useful in tests). */
export function makeInMemoryCreditStore(
  initialGrants: ReadonlyArray<CreditGrant> = [],
  initialBalances: ReadonlyArray<CreditBalance> = [],
): InMemoryCreditStore {
  const store = new InMemoryCreditStore();
  for (const g of initialGrants) {
    store.saveGrant(g);
  }
  for (const b of initialBalances) {
    store.saveBalance(b);
  }
  return store;
}
