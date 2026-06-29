// Discovery service: surface relevant listings via featured, recommended, and search paths.

import type { Listing, ListingId } from "./types.js";
import type { ListingStore } from "./store.js";
import type { ListingFilter } from "./filters.js";
import { listFeaturedListings, sortWithFeaturedFirst } from "./featured.js";
import { matchListings } from "./matcher.js";
import { recommend, type BuyerSignals } from "./recommendation.js";
import { rankListings } from "./ranking.js";

/** Options for the discovery feed. */
export interface DiscoveryOptions {
  /** Category to restrict results to. */
  readonly categoryId?: string;
  /** Tag IDs to restrict results to. */
  readonly tagIds?: ReadonlyArray<string>;
  /** Max number of items to return. */
  readonly limit?: number;
}

/** A single discovery feed result with its provenance label. */
export interface DiscoveryItem {
  readonly listing: Listing;
  readonly source: "featured" | "recommended" | "trending" | "popular";
  readonly score: number;
}

/** Build a discovery feed blending featured, trending, and popular listings. */
export async function buildDiscoveryFeed(
  store: ListingStore,
  options: DiscoveryOptions = {},
): Promise<ReadonlyArray<DiscoveryItem>> {
  const limit = options.limit ?? 30;
  const filter: ListingFilter = {
    status: "published",
    ...(options.categoryId !== undefined ? { categoryId: options.categoryId } : {}),
    ...(options.tagIds !== undefined && options.tagIds.length > 0
      ? { tagIds: [...options.tagIds] }
      : {}),
  };

  const raw = await store.list(filter, 1, 500);
  const allListings = raw.items;

  if (allListings.length === 0) return [];

  // Split into featured and non-featured.
  const now = Date.now();
  const featured = allListings.filter(
    (l) =>
      l.featuredUntil !== undefined &&
      new Date(l.featuredUntil).getTime() > now,
  );

  const nonFeatured = allListings.filter(
    (l) =>
      l.featuredUntil === undefined ||
      new Date(l.featuredUntil).getTime() <= now,
  );

  // Rank non-featured by composite score.
  const relevanceMap = new Map(nonFeatured.map((l) => [l.id, l.relevanceScore]));
  const ranked = rankListings(nonFeatured, relevanceMap);

  const trending = ranked
    .filter((r) => r.compositeScore >= 0.5)
    .slice(0, Math.ceil(limit * 0.4));

  const popular = ranked
    .filter((r) => r.compositeScore < 0.5)
    .slice(0, Math.ceil(limit * 0.3));

  const items: DiscoveryItem[] = [
    ...featured.slice(0, Math.ceil(limit * 0.3)).map((l) => ({
      listing: l,
      source: "featured" as const,
      score: 1,
    })),
    ...trending.map((r) => ({
      listing: r.listing,
      source: "trending" as const,
      score: r.compositeScore,
    })),
    ...popular.map((r) => ({
      listing: r.listing,
      source: "popular" as const,
      score: r.compositeScore,
    })),
  ];

  // Deduplicate by listing id preserving insertion order.
  const seen = new Set<ListingId>();
  const deduped: DiscoveryItem[] = [];
  for (const item of items) {
    if (!seen.has(item.listing.id)) {
      seen.add(item.listing.id);
      deduped.push(item);
    }
  }

  return deduped.slice(0, limit);
}

/** Personalised discovery feed for a known buyer. */
export async function buildPersonalisedFeed(
  store: ListingStore,
  signals: BuyerSignals,
  options: DiscoveryOptions = {},
): Promise<ReadonlyArray<DiscoveryItem>> {
  const limit = options.limit ?? 30;
  const filter: ListingFilter = {
    status: "published",
    ...(options.categoryId !== undefined ? { categoryId: options.categoryId } : {}),
    ...(options.tagIds !== undefined && options.tagIds.length > 0
      ? { tagIds: [...options.tagIds] }
      : {}),
  };

  const raw = await store.list(filter, 1, 500);
  const recommendations = recommend(signals, raw.items).slice(0, limit);

  return recommendations.map((r) => ({
    listing: r.listing,
    source: "recommended" as const,
    score: r.affinity,
  }));
}

/** Keyword-based search discovery returning matched listings. */
export async function searchListings(
  store: ListingStore,
  keywords: ReadonlyArray<string>,
  options: DiscoveryOptions = {},
): Promise<ReadonlyArray<DiscoveryItem>> {
  const limit = options.limit ?? 20;
  const filter: ListingFilter = {
    status: "published",
    ...(options.categoryId !== undefined ? { categoryId: options.categoryId } : {}),
  };

  const raw = await store.list(filter, 1, 500);
  const matches = matchListings({ keywords: [...keywords], tagIds: [] }, raw.items);

  return matches.slice(0, limit).map((m) => ({
    listing: m.listing,
    source: "trending" as const,
    score: m.relevance,
  }));
}

/** Fetch the current featured listings for display in banners or carousels. */
export async function getFeaturedForDisplay(
  store: ListingStore,
  limit = 10,
): Promise<ReadonlyArray<Listing>> {
  const featured = await listFeaturedListings(store);
  return sortWithFeaturedFirst(featured).slice(0, limit);
}
