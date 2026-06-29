// Marketplace query service: unified read access for listings, categories, and tags.

import { type Result } from "@veritas/core";
import type { Listing, ListingId, Category, CategoryId, Tag, TagId, RatingSummary } from "./types.js";
import type { ListingStore, ListingPage } from "./store.js";
import type { ListingFilter, ListingSortField } from "./filters.js";

/** Input for a paginated listing query. */
export interface ListingQueryInput {
  readonly filter: ListingFilter;
  readonly sortBy?: ListingSortField;
  readonly page?: number;
  readonly pageSize?: number;
}

/** Result of a listing query. */
export interface ListingQueryResult {
  readonly items: ReadonlyArray<Listing>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

/** Sort a listing array by the requested field (returns a new array). */
function applySortOrder(
  listings: ReadonlyArray<Listing>,
  sortBy: ListingSortField,
): ReadonlyArray<Listing> {
  const arr = [...listings];
  switch (sortBy) {
    case "relevance":
      return arr.sort((a, b) => b.relevanceScore - a.relevanceScore);
    case "rating":
      return arr.sort((a, b) =>
        b.averageRating !== a.averageRating
          ? b.averageRating - a.averageRating
          : b.reviewCount - a.reviewCount,
      );
    case "price_asc":
      return arr.sort(
        (a, b) =>
          Number(a.price.amount ?? 0) - Number(b.price.amount ?? 0),
      );
    case "price_desc":
      return arr.sort(
        (a, b) =>
          Number(b.price.amount ?? 0) - Number(a.price.amount ?? 0),
      );
    case "newest":
      return arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "popular":
      return arr.sort((a, b) => b.orderCount - a.orderCount);
    default:
      return arr;
  }
}

/** Fetch a single listing by ID. */
export async function getListingById(
  store: ListingStore,
  id: ListingId,
): Promise<Result<Listing>> {
  return store.getById(id);
}

/** Query listings with filter, sort, and pagination. */
export async function queryListings(
  store: ListingStore,
  input: ListingQueryInput,
): Promise<ListingQueryResult> {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 20, 100);
  const sortBy = input.sortBy ?? "relevance";

  // Fetch a broad set then sort in-memory for fields not stored in order.
  const raw = await store.list(input.filter, 1, 1000);
  const sorted = applySortOrder(raw.items, sortBy);
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return {
    items,
    total: raw.total,
    page,
    pageSize,
    hasMore: start + items.length < raw.total,
  };
}

/** Fetch all published listings for a given category. */
export async function listingsByCategory(
  store: ListingStore,
  categoryId: CategoryId,
  page = 1,
  pageSize = 20,
): Promise<ListingPage> {
  return store.list({ categoryId, status: "published" }, page, pageSize);
}

/** Fetch all published listings tagged with a given tag. */
export async function listingsByTag(
  store: ListingStore,
  tagId: TagId,
  page = 1,
  pageSize = 20,
): Promise<ListingPage> {
  return store.list({ tagIds: [tagId], status: "published" }, page, pageSize);
}

/** Fetch a category by ID. */
export async function getCategoryById(
  store: ListingStore,
  id: CategoryId,
): Promise<Result<Category>> {
  return store.getCategory(id);
}

/** List all categories. */
export async function listCategories(
  store: ListingStore,
): Promise<ReadonlyArray<Category>> {
  return store.listCategories();
}

/** Fetch a tag by ID. */
export async function getTagById(
  store: ListingStore,
  id: TagId,
): Promise<Result<Tag>> {
  return store.getTag(id);
}

/** List all tags. */
export async function listTags(
  store: ListingStore,
): Promise<ReadonlyArray<Tag>> {
  return store.listTags();
}

/** Compute a rating summary for a listing from its stored reviews. */
export async function getRatingSummary(
  store: ListingStore,
  listingId: ListingId,
): Promise<RatingSummary> {
  const reviews = await store.listReviews(listingId);
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const r of reviews) {
    const star = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    if (star >= 1 && star <= 5) {
      dist[star] = (dist[star] ?? 0) + 1;
      total += r.rating;
    }
  }

  const count = reviews.length;
  const average = count > 0 ? total / count : 0;

  return {
    listingId,
    averageRating: Math.round(average * 100) / 100,
    reviewCount: count,
    distribution: dist as Readonly<Record<1 | 2 | 3 | 4 | 5, number>>,
  };
}
