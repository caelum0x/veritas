// Featured/promoted listing management: set, clear, and query featured status.

import { ok, err, type Result, ValidationError, asIsoTimestamp } from "@veritas/core";
import type { Listing, ListingId } from "./types.js";
import type { ListingStore } from "./store.js";

/** Options for featuring a listing. */
export interface FeatureOptions {
  /** ISO timestamp until which the listing is featured. */
  readonly featuredUntil: string;
}

/** Set a listing as featured until the given timestamp. */
export async function featureListing(
  store: ListingStore,
  id: ListingId,
  options: FeatureOptions,
): Promise<Result<Listing>> {
  const result = await store.getById(id);
  if (!result.ok) return result;

  const until = new Date(options.featuredUntil);
  if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
    return err(
      new ValidationError({
        message: "featuredUntil must be a valid future ISO timestamp",
      }),
    );
  }

  const updated: Listing = {
    ...result.value,
    featuredUntil: asIsoTimestamp(options.featuredUntil),
    updatedAt: asIsoTimestamp(new Date().toISOString()),
  };

  return store.save(updated);
}

/** Remove featured status from a listing. */
export async function unfeatureListing(
  store: ListingStore,
  id: ListingId,
): Promise<Result<Listing>> {
  const result = await store.getById(id);
  if (!result.ok) return result;

  const updated: Listing = {
    ...result.value,
    featuredUntil: undefined,
    updatedAt: asIsoTimestamp(new Date().toISOString()),
  };

  return store.save(updated);
}

/** Return all currently featured listings (featuredUntil > now). */
export async function listFeaturedListings(
  store: ListingStore,
): Promise<ReadonlyArray<Listing>> {
  const page = await store.list({ status: "published", featuredOnly: true }, 1, 100);
  const now = Date.now();
  return page.items.filter(
    (l) =>
      l.featuredUntil !== undefined &&
      new Date(l.featuredUntil).getTime() > now,
  );
}

/** Check whether a specific listing is currently featured. */
export function isFeatured(listing: Listing): boolean {
  if (listing.featuredUntil === undefined) return false;
  return new Date(listing.featuredUntil).getTime() > Date.now();
}

/** Sort listings so featured ones appear first, then by relevance score. */
export function sortWithFeaturedFirst(
  listings: ReadonlyArray<Listing>,
): ReadonlyArray<Listing> {
  return [...listings].sort((a, b) => {
    const aFeatured = isFeatured(a) ? 1 : 0;
    const bFeatured = isFeatured(b) ? 1 : 0;
    if (bFeatured !== aFeatured) return bFeatured - aFeatured;
    return b.relevanceScore - a.relevanceScore;
  });
}
