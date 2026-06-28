// Price catalog: maps plan slugs to their base unit prices and rule sets.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type PriceMoney, priceMoney, type Currency } from "./types.js";
import { type PricingRule } from "./rule-engine.js";
import { CatalogEntryNotFoundError } from "./errors.js";
import { Usdc } from "@veritas/core";

/** A single entry in the price catalog for one plan. */
export interface CatalogEntry {
  /** Unique slug matching PricingContext.planSlug. */
  readonly planSlug: string;
  /** Human-readable plan display name. */
  readonly displayName: string;
  /** Monthly unit price in USDC base units. */
  readonly monthlyUnitPriceBaseUnits: bigint;
  /** Yearly unit price in USDC base units (typically discounted). */
  readonly yearlyUnitPriceBaseUnits: bigint;
  readonly currency: Currency;
  /** Ordered rules applied on top of the base price. */
  readonly rules: readonly PricingRule[];
}

export const CatalogEntryDefinitionSchema = z.object({
  planSlug: z.string().min(1),
  displayName: z.string().min(1),
  monthlyUnitPriceBaseUnits: z.bigint().nonnegative(),
  yearlyUnitPriceBaseUnits: z.bigint().nonnegative(),
  currency: z.enum(["USDC"]),
});

export type CatalogEntryDefinition = z.infer<typeof CatalogEntryDefinitionSchema>;

/** Port: retrieve catalog entries by plan slug. */
export interface CatalogRepository {
  findBySlug(planSlug: string): Promise<CatalogEntry | undefined>;
  listAll(): Promise<readonly CatalogEntry[]>;
}

/** In-memory catalog for local dev and tests. */
export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly entries: Map<string, CatalogEntry>;

  constructor(initial: readonly CatalogEntry[] = []) {
    this.entries = new Map(initial.map((e) => [e.planSlug, e]));
  }

  async findBySlug(planSlug: string): Promise<CatalogEntry | undefined> {
    return this.entries.get(planSlug);
  }

  async listAll(): Promise<readonly CatalogEntry[]> {
    return [...this.entries.values()];
  }

  /** Return a new catalog with an additional entry (immutable). */
  withEntry(entry: CatalogEntry): InMemoryCatalogRepository {
    return new InMemoryCatalogRepository([...this.entries.values(), entry]);
  }
}

/** Resolve the base unit price for a plan given billing interval. */
export function resolveUnitPrice(entry: CatalogEntry, interval: "MONTHLY" | "YEARLY"): PriceMoney {
  const baseUnits =
    interval === "YEARLY" ? entry.yearlyUnitPriceBaseUnits : entry.monthlyUnitPriceBaseUnits;
  return priceMoney(Usdc.fromBaseUnits(baseUnits), entry.currency);
}

/**
 * Look up a catalog entry or return a typed not-found error.
 */
export async function requireCatalogEntry(
  planSlug: string,
  repo: CatalogRepository,
): Promise<Result<CatalogEntry, CatalogEntryNotFoundError>> {
  const entry = await repo.findBySlug(planSlug);
  if (!entry) {
    return err(new CatalogEntryNotFoundError(planSlug));
  }
  return ok(entry);
}
