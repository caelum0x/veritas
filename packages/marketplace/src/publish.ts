// Publish/unpublish lifecycle operations for marketplace listings.

import { ok, err, type Result, epochToIso } from "@veritas/core";
import type { ListingStore } from "./store.js";
import type { Listing, ListingId, PublishListingInput, UnpublishListingInput } from "./types.js";
import { publishListingInputSchema, unpublishListingInputSchema } from "./types.js";
import { ListingNotFoundError, ListingStateError, ListingForbiddenError, ListingValidationError } from "./errors.js";

/** Service: transition a draft listing to pending_review. */
export async function publishListing(
  store: ListingStore,
  input: unknown,
): Promise<Result<Listing>> {
  const parsed = publishListingInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ListingValidationError(parsed.error.errors[0]?.message ?? "Invalid input"));
  }
  const { listingId, sellerId } = parsed.data as PublishListingInput;

  const getResult = await store.getById(listingId as ListingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status !== "draft") {
    return err(
      new ListingStateError(
        `Listing ${listingId} cannot be published from status "${listing.status}"`,
        { details: { listingId, currentStatus: listing.status } },
      ),
    );
  }

  const updated: Listing = {
    ...listing,
    status: "pending_review",
    updatedAt: epochToIso(Date.now()),
  };

  return store.save(updated);
}

/** Service: move a published listing back to draft (seller-initiated withdrawal). */
export async function unpublishListing(
  store: ListingStore,
  input: unknown,
): Promise<Result<Listing>> {
  const parsed = unpublishListingInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ListingValidationError(parsed.error.errors[0]?.message ?? "Invalid input"));
  }
  const { listingId, actorId, reason } = parsed.data as UnpublishListingInput;

  const getResult = await store.getById(listingId as ListingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status === "archived") {
    return err(
      new ListingStateError(`Listing ${listingId} is archived and cannot be unpublished`, {
        details: { listingId },
      }),
    );
  }

  const updated: Listing = {
    ...listing,
    status: "draft",
    updatedAt: epochToIso(Date.now()),
  };

  const saveResult = await store.save(updated);
  if (!saveResult.ok) return saveResult;

  return ok({ ...saveResult.value });
}

/** Service: archive a listing permanently (no further state transitions allowed). */
export async function archiveListing(
  store: ListingStore,
  listingId: ListingId,
  actorId: string,
): Promise<Result<Listing>> {
  const getResult = await store.getById(listingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status === "archived") {
    return ok(listing);
  }

  const updated: Listing = {
    ...listing,
    status: "archived",
    updatedAt: epochToIso(Date.now()),
  };

  return store.save(updated);
}

/** Service: suspend a published listing (admin/moderator action). */
export async function suspendListing(
  store: ListingStore,
  listingId: ListingId,
  actorId: string,
  reason?: string,
): Promise<Result<Listing>> {
  const getResult = await store.getById(listingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status === "archived") {
    return err(
      new ListingStateError(`Listing ${listingId} is archived and cannot be suspended`, {
        details: { listingId },
      }),
    );
  }

  const updated: Listing = {
    ...listing,
    status: "suspended",
    updatedAt: epochToIso(Date.now()),
  };

  return store.save(updated);
}

/** Service: reinstate a suspended listing back to published. */
export async function reinstateListing(
  store: ListingStore,
  listingId: ListingId,
  actorId: string,
): Promise<Result<Listing>> {
  const getResult = await store.getById(listingId);
  if (!getResult.ok) {
    return err(new ListingNotFoundError(listingId));
  }
  const listing = getResult.value;

  if (listing.status !== "suspended") {
    return err(
      new ListingStateError(
        `Only suspended listings can be reinstated; current status: "${listing.status}"`,
        { details: { listingId, currentStatus: listing.status } },
      ),
    );
  }

  const updated: Listing = {
    ...listing,
    status: "published",
    updatedAt: epochToIso(Date.now()),
  };

  return store.save(updated);
}
