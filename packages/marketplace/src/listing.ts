// Marketplace listing entity: a published offer of a verification service by an agent.

import { z } from "zod";
import { newId, type Id, type IsoTimestamp, epochToIso } from "@veritas/core";
import type { Service, Agent } from "@veritas/contracts";

/** Branded id for marketplace listings. */
export type ListingId = Id<"lst">;

export const newListingId = (): ListingId => newId("lst");

/** Lifecycle state of a listing. */
export type ListingStatus = "draft" | "active" | "paused" | "archived";

/** Delivery mode offered by the listing. */
export type DeliveryMode = "sync" | "async" | "batch";

/** Pricing model options. */
export type PricingModel = "fixed" | "per_unit" | "subscription" | "quote";

/** Immutable marketplace listing. */
export interface Listing {
  readonly id: ListingId;
  readonly agentId: string;
  readonly serviceId: string;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly tagIds: readonly string[];
  readonly pricingModel: PricingModel;
  /** Price in USDC base units (micro-USDC, 6 decimals). */
  readonly priceBaseUnits: bigint;
  readonly deliveryMode: DeliveryMode;
  readonly avgTurnaroundMs: number;
  readonly status: ListingStatus;
  readonly featuredUntil: IsoTimestamp | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Input required to create a new Listing. */
export interface CreateListingInput {
  readonly agentId: string;
  readonly serviceId: string;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly tagIds?: readonly string[];
  readonly pricingModel: PricingModel;
  readonly priceBaseUnits: bigint;
  readonly deliveryMode: DeliveryMode;
  readonly avgTurnaroundMs: number;
  readonly metadata?: Record<string, unknown>;
}

/** Zod schema for CreateListingInput (priceBaseUnits as string for JSON transport). */
export const createListingSchema = z.object({
  agentId: z.string().min(1),
  serviceId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string().min(1)).max(20).optional(),
  pricingModel: z.enum(["fixed", "per_unit", "subscription", "quote"]),
  priceBaseUnits: z.union([z.bigint(), z.string().transform((s) => BigInt(s))]),
  deliveryMode: z.enum(["sync", "async", "batch"]),
  avgTurnaroundMs: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});

/** Partial update schema. */
export const updateListingSchema = createListingSchema
  .omit({ agentId: true, serviceId: true })
  .partial();

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

/** Factory: construct a Listing from validated input. */
export function createListing(input: CreateListingInput): Listing {
  const now = epochToIso(Date.now());
  return {
    id: newListingId(),
    agentId: input.agentId,
    serviceId: input.serviceId,
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
    tagIds: input.tagIds ?? [],
    pricingModel: input.pricingModel,
    priceBaseUnits: input.priceBaseUnits,
    deliveryMode: input.deliveryMode,
    avgTurnaroundMs: input.avgTurnaroundMs,
    status: "draft",
    featuredUntil: null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Return a new Listing with the supplied patch applied. */
export function applyListingUpdate(
  listing: Listing,
  patch: UpdateListingInput,
): Listing {
  return {
    ...listing,
    ...(patch.title !== undefined && { title: patch.title.trim() }),
    ...(patch.description !== undefined && { description: patch.description.trim() }),
    ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
    ...(patch.tagIds !== undefined && { tagIds: patch.tagIds }),
    ...(patch.pricingModel !== undefined && { pricingModel: patch.pricingModel }),
    ...(patch.priceBaseUnits !== undefined && { priceBaseUnits: patch.priceBaseUnits }),
    ...(patch.deliveryMode !== undefined && { deliveryMode: patch.deliveryMode }),
    ...(patch.avgTurnaroundMs !== undefined && { avgTurnaroundMs: patch.avgTurnaroundMs }),
    ...(patch.metadata !== undefined && { metadata: patch.metadata }),
    updatedAt: epochToIso(Date.now()),
  };
}

/** Return a new Listing with status set to "active". */
export function activateListing(listing: Listing): Listing {
  return { ...listing, status: "active", updatedAt: epochToIso(Date.now()) };
}

/** Return a new Listing with status set to "paused". */
export function pauseListing(listing: Listing): Listing {
  return { ...listing, status: "paused", updatedAt: epochToIso(Date.now()) };
}

/** Return a new Listing with status set to "archived". */
export function archiveListing(listing: Listing): Listing {
  return { ...listing, status: "archived", updatedAt: epochToIso(Date.now()) };
}

/** Return a new Listing with featuredUntil set. */
export function featureListing(listing: Listing, until: IsoTimestamp): Listing {
  return { ...listing, featuredUntil: until, updatedAt: epochToIso(Date.now()) };
}

/** Return true when the listing is publicly visible. */
export function isListingActive(listing: Listing): boolean {
  return listing.status === "active";
}

/** Return true when the listing is currently featured. */
export function isListingFeatured(listing: Listing): boolean {
  if (listing.featuredUntil === null) return false;
  return new Date(listing.featuredUntil).getTime() > Date.now();
}
