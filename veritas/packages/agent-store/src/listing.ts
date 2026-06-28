// Agent Store listing model representing a published agent service entry.
import { z } from "zod";
import { newId, Result, ok, err, ValidationError, IsoTimestamp, epochToIso } from "@veritas/core";
import { ServiceDescriptor } from "./service-descriptor.js";
import { ListingId } from "./types.js";

export type ListingStatus = "draft" | "active" | "suspended" | "retired";

export interface Listing {
  readonly id: ListingId;
  readonly agentDid: string;
  readonly walletAddress: string;
  readonly descriptor: ServiceDescriptor;
  readonly status: ListingStatus;
  readonly publishedAt: IsoTimestamp | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

const createListingSchema = z.object({
  agentDid: z.string().min(1),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export interface CreateListingInput {
  readonly agentDid: string;
  readonly walletAddress: string;
  readonly descriptor: ServiceDescriptor;
}

export function createListing(input: CreateListingInput): Result<Listing, ValidationError> {
  const parsed = createListingSchema.safeParse({
    agentDid: input.agentDid,
    walletAddress: input.walletAddress,
  });

  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid listing input",
        issues: [{ path: "listing", message: parsed.error.message }],
      })
    );
  }

  const now = epochToIso(Date.now());
  return ok({
    id: newId("listing") as ListingId,
    agentDid: parsed.data.agentDid,
    walletAddress: parsed.data.walletAddress,
    descriptor: input.descriptor,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export function publishListing(listing: Listing): Result<Listing, ValidationError> {
  if (listing.status !== "draft") {
    return err(
      new ValidationError({
        message: "Only draft listings can be published",
        issues: [{ path: "status", message: `Current status is ${listing.status}` }],
      })
    );
  }

  const now = epochToIso(Date.now());
  return ok({
    ...listing,
    status: "active",
    publishedAt: now,
    updatedAt: now,
  });
}

export function suspendListing(listing: Listing, reason: string): Result<Listing, ValidationError> {
  if (listing.status !== "active") {
    return err(
      new ValidationError({
        message: "Only active listings can be suspended",
        issues: [{ path: "status", message: `Current status is ${listing.status}, reason: ${reason}` }],
      })
    );
  }

  return ok({
    ...listing,
    status: "suspended",
    updatedAt: epochToIso(Date.now()),
  });
}

export function retireListing(listing: Listing): Listing {
  return {
    ...listing,
    status: "retired",
    updatedAt: epochToIso(Date.now()),
  };
}
