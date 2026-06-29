// Catalog client for discovering and querying services on the agent store.
import { Result, ok, err, NotFoundError, Page, makePage, toPageRequest, encodeCursor } from "@veritas/core";
import { Listing, ListingStatus } from "./listing.js";
import { ServiceDescriptor } from "./service-descriptor.js";

export interface CatalogFilter {
  readonly tags?: readonly string[];
  readonly pricingTierName?: string;
  readonly status?: ListingStatus;
  readonly agentDid?: string;
  readonly query?: string;
}

export interface CatalogClientOptions {
  readonly pageSize?: number;
}

export interface CatalogRepository {
  findById(id: string): Promise<Listing | null>;
  findAll(filter: CatalogFilter, cursor?: string, limit?: number): Promise<Listing[]>;
  count(filter: CatalogFilter): Promise<number>;
  findByServiceId(serviceId: string): Promise<Listing | null>;
}

export class CatalogClient {
  private readonly repo: CatalogRepository;
  private readonly defaultPageSize: number;

  constructor(repo: CatalogRepository, options: CatalogClientOptions = {}) {
    this.repo = repo;
    this.defaultPageSize = options.pageSize ?? 20;
  }

  async getListing(id: string): Promise<Result<Listing, NotFoundError>> {
    const listing = await this.repo.findById(id);
    if (!listing) {
      return err(NotFoundError.of("Listing", id));
    }
    return ok(listing);
  }

  async getListingByServiceId(
    serviceId: string
  ): Promise<Result<Listing, NotFoundError>> {
    const listing = await this.repo.findByServiceId(serviceId);
    if (!listing) {
      return err(NotFoundError.of("Listing", serviceId));
    }
    return ok(listing);
  }

  async searchListings(
    filter: CatalogFilter,
    pageRequest?: { cursor?: string; limit?: number }
  ): Promise<Page<Listing>> {
    const req = toPageRequest(pageRequest ?? {});
    const limit = req.limit ?? this.defaultPageSize;
    const listings = await this.repo.findAll(filter, req.cursor, limit + 1);
    const hasMore = listings.length > limit;
    const items = hasMore ? listings.slice(0, limit) : listings;
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = hasMore && lastItem ? encodeCursor({ id: lastItem.id }) : null;
    return makePage(items, nextCursor);
  }

  async getActiveListings(
    pageRequest?: { cursor?: string; limit?: number }
  ): Promise<Page<Listing>> {
    return this.searchListings({ status: "active" }, pageRequest);
  }

  async getDescriptor(
    serviceId: string
  ): Promise<Result<ServiceDescriptor, NotFoundError>> {
    const listingResult = await this.getListingByServiceId(serviceId);
    if (!listingResult.ok) return listingResult;
    return ok(listingResult.value.descriptor);
  }

  async findByAgent(
    agentDid: string,
    pageRequest?: { cursor?: string; limit?: number }
  ): Promise<Page<Listing>> {
    return this.searchListings({ agentDid }, pageRequest);
  }

  async findByTag(
    tag: string,
    pageRequest?: { cursor?: string; limit?: number }
  ): Promise<Page<Listing>> {
    return this.searchListings({ tags: [tag] }, pageRequest);
  }
}
