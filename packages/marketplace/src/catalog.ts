// Service catalog: aggregates listings with their associated service and agent metadata.

import {
  type Result,
  ok,
  err,
  type Page,
  makePage,
  NotFoundError,
} from "@veritas/core";
import type { Service, Agent } from "@veritas/contracts";
import type { Listing, ListingId, ListingStatus } from "./listing.js";
import type { Category, CategoryId } from "./category.js";
import type { Tag, TagId } from "./tag.js";

/** A fully-hydrated listing entry surfaced by the catalog. */
export interface CatalogEntry {
  readonly listing: Listing;
  readonly service: Service;
  readonly agent: Agent;
  readonly category: Category;
  readonly tags: readonly Tag[];
}

/** Catalog query parameters for browsing. */
export interface CatalogQuery {
  readonly categoryId?: CategoryId;
  readonly tagIds?: readonly TagId[];
  readonly agentId?: string;
  readonly status?: ListingStatus;
  readonly pricingModel?: Listing["pricingModel"];
  readonly maxPriceBaseUnits?: bigint;
  readonly deliveryMode?: Listing["deliveryMode"];
  readonly cursor?: string;
  readonly limit?: number;
}

/** Port: data dependencies the catalog needs resolved externally. */
export interface CatalogDeps {
  getService(id: string): Promise<Service | null>;
  getAgent(id: string): Promise<Agent | null>;
  getCategory(id: CategoryId): Promise<Category | null>;
  getTags(ids: readonly string[]): Promise<Tag[]>;
}

/** Filter a flat list of listings according to a CatalogQuery. */
export function filterListings(
  listings: readonly Listing[],
  query: CatalogQuery,
): Listing[] {
  return listings.filter((l) => {
    if (query.categoryId !== undefined && l.categoryId !== query.categoryId) return false;
    if (query.agentId !== undefined && l.agentId !== query.agentId) return false;
    if (query.status !== undefined && l.status !== query.status) return false;
    if (query.pricingModel !== undefined && l.pricingModel !== query.pricingModel) return false;
    if (
      query.maxPriceBaseUnits !== undefined &&
      l.priceBaseUnits > query.maxPriceBaseUnits
    )
      return false;
    if (query.deliveryMode !== undefined && l.deliveryMode !== query.deliveryMode) return false;
    if (query.tagIds && query.tagIds.length > 0) {
      const has = query.tagIds.some((t) => l.tagIds.includes(t));
      if (!has) return false;
    }
    return true;
  });
}

/** Hydrate a single Listing into a CatalogEntry using the provided deps. */
export async function hydrateListing(
  listing: Listing,
  deps: CatalogDeps,
): Promise<Result<CatalogEntry>> {
  const [service, agent, category, tags] = await Promise.all([
    deps.getService(listing.serviceId),
    deps.getAgent(listing.agentId),
    deps.getCategory(listing.categoryId as CategoryId),
    deps.getTags(listing.tagIds as string[]),
  ]);

  if (!service) {
    return err(new NotFoundError({ message: `Service ${listing.serviceId} not found` }));
  }
  if (!agent) {
    return err(new NotFoundError({ message: `Agent ${listing.agentId} not found` }));
  }
  if (!category) {
    return err(
      new NotFoundError({ message: `Category ${listing.categoryId} not found` }),
    );
  }

  return ok({ listing, service, agent, category, tags });
}

/** Build a cursor-paginated page of CatalogEntry values from a pre-sorted array. */
export function paginateCatalog(
  entries: readonly CatalogEntry[],
  cursor: string | undefined,
  limit: number,
): Page<CatalogEntry> {
  const startIndex = cursor
    ? entries.findIndex((e) => e.listing.id === cursor) + 1
    : 0;
  const slice = entries.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < entries.length;
  const nextCursor = hasMore ? (slice[slice.length - 1]?.listing.id ?? null) : null;

  return makePage(slice, nextCursor);
}
