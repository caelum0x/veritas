// Filter value objects and predicate builders for marketplace listing queries.

import { z } from "zod";
import type { ListingStatus, CategoryId, TagId } from "./types.js";

/** Zod schema for listing filter input. */
export const ListingFilterSchema = z.object({
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(["draft", "pending_review", "published", "suspended", "archived"]).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxPriceUsdc: z.number().int().positive().optional(),
  minPriceUsdc: z.number().int().nonnegative().optional(),
  featuredOnly: z.boolean().optional(),
  searchText: z.string().max(200).optional(),
  serviceId: z.string().optional(),
});

/** Validated listing filter. */
export type ListingFilter = z.infer<typeof ListingFilterSchema>;

/** Sort field options for listing queries. */
export type ListingSortField =
  | "relevance"
  | "rating"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "popular";

/** Zod schema for sort field. */
export const ListingSortFieldSchema = z.enum([
  "relevance",
  "rating",
  "price_asc",
  "price_desc",
  "newest",
  "popular",
]);

/** Combined filter + sort specification. */
export interface ListingFilterSpec {
  readonly filter: ListingFilter;
  readonly sortBy: ListingSortField;
  readonly page: number;
  readonly pageSize: number;
}

/** Default filter spec. */
export function defaultFilterSpec(): ListingFilterSpec {
  return {
    filter: { status: "published" },
    sortBy: "relevance",
    page: 1,
    pageSize: 20,
  };
}

/** Merge partial filter overrides into a base spec (immutable). */
export function mergeFilter(
  base: ListingFilterSpec,
  overrides: Partial<ListingFilterSpec>,
): ListingFilterSpec {
  return {
    ...base,
    ...overrides,
    filter: { ...base.filter, ...(overrides.filter ?? {}) },
  };
}

/** Normalise and validate raw filter input; returns null on validation failure. */
export function parseListingFilter(
  raw: unknown,
): ListingFilter | null {
  const result = ListingFilterSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Type-safe predicate that checks a listing matches all active filter criteria. */
export type ListingPredicate = (listing: {
  categoryId: CategoryId;
  tagIds: ReadonlyArray<TagId>;
  status: ListingStatus;
  averageRating: number;
  price: { amountUsdc: number | bigint };
  featuredUntil: string | undefined;
  title: string;
  summary: string;
  serviceId: string;
}) => boolean;

/** Build a composable predicate from a ListingFilter. */
export function buildPredicate(filter: ListingFilter): ListingPredicate {
  const checks: Array<(l: Parameters<ListingPredicate>[0]) => boolean> = [];

  if (filter.categoryId !== undefined) {
    const catId = filter.categoryId as CategoryId;
    checks.push((l) => l.categoryId === catId);
  }

  if (filter.tagIds !== undefined && filter.tagIds.length > 0) {
    const required = new Set(filter.tagIds as TagId[]);
    checks.push((l) => [...required].every((t) => l.tagIds.includes(t)));
  }

  if (filter.status !== undefined) {
    const s = filter.status;
    checks.push((l) => l.status === s);
  }

  if (filter.minRating !== undefined) {
    const min = filter.minRating;
    checks.push((l) => l.averageRating >= min);
  }

  if (filter.minPriceUsdc !== undefined) {
    const min = filter.minPriceUsdc;
    checks.push((l) => l.price.amountUsdc >= min);
  }

  if (filter.maxPriceUsdc !== undefined) {
    const max = filter.maxPriceUsdc;
    checks.push((l) => l.price.amountUsdc <= max);
  }

  if (filter.featuredOnly === true) {
    const now = Date.now();
    checks.push(
      (l) =>
        l.featuredUntil !== undefined && new Date(l.featuredUntil).getTime() > now,
    );
  }

  if (filter.searchText !== undefined && filter.searchText.trim() !== "") {
    const needle = filter.searchText.trim().toLowerCase();
    checks.push(
      (l) =>
        l.title.toLowerCase().includes(needle) ||
        l.summary.toLowerCase().includes(needle),
    );
  }

  if (filter.serviceId !== undefined) {
    const svcId = filter.serviceId;
    checks.push((l) => l.serviceId === svcId);
  }

  return (listing) => checks.every((fn) => fn(listing));
}
