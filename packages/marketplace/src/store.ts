// ListingStore port interface and in-memory implementation for marketplace listings.

import { ok, err, type Result, NotFoundError, ConflictError } from "@veritas/core";
import type { Listing, ListingId, Category, CategoryId, Tag, TagId, ListingReview } from "./types.js";
import type { ListingFilter } from "./filters.js";
import { buildPredicate } from "./filters.js";

/** Pagination cursor for listing queries. */
export interface ListingPage {
  readonly items: ReadonlyArray<Listing>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/** Core persistence port for marketplace listings. */
export interface ListingStore {
  getById(id: ListingId): Promise<Result<Listing>>;
  list(filter: ListingFilter, page: number, pageSize: number): Promise<ListingPage>;
  save(listing: Listing): Promise<Result<Listing>>;
  delete(id: ListingId): Promise<Result<void>>;

  getCategory(id: CategoryId): Promise<Result<Category>>;
  listCategories(): Promise<ReadonlyArray<Category>>;
  saveCategory(category: Category): Promise<Result<Category>>;

  getTag(id: TagId): Promise<Result<Tag>>;
  listTags(): Promise<ReadonlyArray<Tag>>;
  saveTag(tag: Tag): Promise<Result<Tag>>;

  addReview(review: ListingReview): Promise<Result<ListingReview>>;
  listReviews(listingId: ListingId): Promise<ReadonlyArray<ListingReview>>;
}

/** In-memory ListingStore for development and testing. */
export class InMemoryListingStore implements ListingStore {
  private readonly listings = new Map<ListingId, Listing>();
  private readonly categories = new Map<CategoryId, Category>();
  private readonly tags = new Map<TagId, Tag>();
  private readonly reviews = new Map<string, ListingReview>();

  async getById(id: ListingId): Promise<Result<Listing>> {
    const listing = this.listings.get(id);
    if (listing === undefined) {
      return err(new NotFoundError({ message: `Listing not found: ${id}` }));
    }
    return ok(listing);
  }

  async list(
    filter: ListingFilter,
    page: number,
    pageSize: number,
  ): Promise<ListingPage> {
    const predicate = buildPredicate(filter);
    const all = [...this.listings.values()].filter((l) =>
      predicate({
        categoryId: l.categoryId,
        tagIds: l.tagIds,
        status: l.status,
        averageRating: l.averageRating,
        price: { amountUsdc: Number(l.price.amount ?? 0) },
        featuredUntil: l.featuredUntil,
        title: l.title,
        summary: l.summary,
        serviceId: l.serviceId,
      }),
    );
    const total = all.length;
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, total, page, pageSize };
  }

  async save(listing: Listing): Promise<Result<Listing>> {
    this.listings.set(listing.id, listing);
    return ok(listing);
  }

  async delete(id: ListingId): Promise<Result<void>> {
    if (!this.listings.has(id)) {
      return err(new NotFoundError({ message: `Listing not found: ${id}` }));
    }
    this.listings.delete(id);
    return ok(undefined);
  }

  async getCategory(id: CategoryId): Promise<Result<Category>> {
    const cat = this.categories.get(id);
    if (cat === undefined) {
      return err(new NotFoundError({ message: `Category not found: ${id}` }));
    }
    return ok(cat);
  }

  async listCategories(): Promise<ReadonlyArray<Category>> {
    return [...this.categories.values()];
  }

  async saveCategory(category: Category): Promise<Result<Category>> {
    this.categories.set(category.id, category);
    return ok(category);
  }

  async getTag(id: TagId): Promise<Result<Tag>> {
    const tag = this.tags.get(id);
    if (tag === undefined) {
      return err(new NotFoundError({ message: `Tag not found: ${id}` }));
    }
    return ok(tag);
  }

  async listTags(): Promise<ReadonlyArray<Tag>> {
    return [...this.tags.values()];
  }

  async saveTag(tag: Tag): Promise<Result<Tag>> {
    this.tags.set(tag.id, tag);
    return ok(tag);
  }

  async addReview(review: ListingReview): Promise<Result<ListingReview>> {
    const existing = [...this.reviews.values()].find(
      (r) =>
        r.listingId === review.listingId &&
        r.reviewerAgentId === review.reviewerAgentId,
    );
    if (existing !== undefined) {
      return err(
        new ConflictError({ message: "Agent has already reviewed this listing" }),
      );
    }
    this.reviews.set(review.id, review);
    return ok(review);
  }

  async listReviews(listingId: ListingId): Promise<ReadonlyArray<ListingReview>> {
    return [...this.reviews.values()].filter((r) => r.listingId === listingId);
  }
}
