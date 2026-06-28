// Flow: submit a listing review then trigger a reputation score update for the seller agent.

import {
  type Result,
  ok,
  err,
  epochToIso,
  newId,
  type EventBus,
  type Logger,
  noopLogger,
} from "@veritas/core";
import type { ListingStore } from "@veritas/marketplace";
import type { ReputationPort } from "./deps.js";
import { ReviewFlowError } from "./errors.js";
import {
  makeReviewSubmittedEvent,
  type ReviewSubmittedPayload,
} from "./events.js";
import { reputationUpdateFlow } from "./reputation-update.flow.js";

export interface RateAndReviewInput {
  readonly listingId: string;
  readonly reviewerId: string;
  readonly sellerAgentId: string;
  readonly rating: number;
  readonly comment?: string;
  readonly title: string;
  readonly body: string;
}

export interface RateAndReviewOutput {
  readonly reviewId: string;
  readonly listingId: string;
  readonly newSellerPts: number;
}

export interface RateAndReviewFlowDeps {
  readonly listingStore: ListingStore;
  readonly reputation: ReputationPort;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Submit a listing review and update the seller's reputation score. */
export async function rateAndReviewFlow(
  input: RateAndReviewInput,
  deps: RateAndReviewFlowDeps,
): Promise<Result<RateAndReviewOutput>> {
  const log = deps.logger ?? noopLogger;

  // Validate rating in [1, 5]
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return err(new ReviewFlowError(`Rating must be an integer in [1, 5], got ${input.rating}`));
  }

  // Step 1: verify listing exists
  type StoreListingId = Parameters<ListingStore["getById"]>[0];
  const listingResult = await deps.listingStore.getById(input.listingId as StoreListingId);
  if (!listingResult.ok) {
    log.error("rate-and-review: listing not found", { listingId: input.listingId });
    return err(
      new ReviewFlowError(`Listing not found: ${input.listingId}`, { cause: listingResult.error }),
    );
  }

  // Step 2: construct and save listing review (types.ts ListingReview shape)
  type StoreReview = Parameters<ListingStore["addReview"]>[0];
  const now = epochToIso(Date.now());
  const review: StoreReview = {
    id: newId("lrev"),
    listingId: input.listingId as StoreReview["listingId"],
    reviewerAgentId: input.reviewerId,
    rating: input.rating,
    comment: input.comment,
    createdAt: now,
  };

  const addResult = await deps.listingStore.addReview(review);
  if (!addResult.ok) {
    log.error("rate-and-review: failed to save review", { listingId: input.listingId });
    const addErr = addResult.error;
    const addMsg = addErr instanceof Error ? addErr.message : String(addErr);
    return err(
      new ReviewFlowError(`Failed to save review: ${addMsg}`, { cause: addErr }),
    );
  }
  const savedReview = addResult.value;
  log.info("rate-and-review: review saved", { reviewId: savedReview.id });

  // Step 3: emit review submitted event
  if (deps.eventBus) {
    const reviewPayload: ReviewSubmittedPayload = {
      listingId: input.listingId,
      reviewerId: input.reviewerId,
      rating: input.rating,
      reviewId: savedReview.id,
    };
    deps.eventBus.publish(makeReviewSubmittedEvent(reviewPayload));
  }

  // Step 4: update seller reputation based on rating (non-fatal if fails)
  const orderOutcome = input.rating >= 4 ? "success" : input.rating >= 2 ? "partial" : "failure";
  const repResult = await reputationUpdateFlow(
    {
      agentId: input.sellerAgentId,
      outcome: orderOutcome,
      confidence: input.rating / 5,
      reason: `Review rating: ${input.rating}/5`,
    },
    { reputation: deps.reputation, eventBus: deps.eventBus, logger: log },
  );
  if (!repResult.ok) {
    log.warn("rate-and-review: reputation update failed (non-fatal)", { agentId: input.sellerAgentId });
  }

  const newSellerPts = repResult.ok ? repResult.value.newPts : 0;

  return ok({
    reviewId: savedReview.id,
    listingId: input.listingId,
    newSellerPts,
  });
}
