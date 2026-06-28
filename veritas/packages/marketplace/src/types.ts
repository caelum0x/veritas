// Shared domain types for the marketplace module.

import { z } from "zod";
import type { IsoTimestamp, Score, UserId } from "@veritas/core";
import type { Service, Money } from "@veritas/contracts";

/** Stable branded ID for a marketplace listing. */
export type ListingId = string & { readonly __listingId: true };

/** Stable branded ID for a marketplace category. */
export type CategoryId = string & { readonly __categoryId: true };

/** Stable branded ID for a marketplace tag. */
export type TagId = string & { readonly __tagId: true };

/** Listing visibility state. */
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "suspended"
  | "archived";

/** Moderation verdict on a listing. */
export type ModerationVerdict = "approved" | "rejected" | "needs_changes";

export const moderationVerdictSchema = z.enum([
  "approved",
  "rejected",
  "needs_changes",
]);

/** Stable branded ID for a moderation case. */
export type ModerationCaseId = string & { readonly __moderationCaseId: true };

/** A marketplace listing that wraps a Service with discovery metadata. */
export interface Listing {
  readonly id: ListingId;
  readonly serviceId: string;
  readonly service: Service;
  readonly categoryId: CategoryId;
  readonly tagIds: ReadonlyArray<TagId>;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly price: Money;
  readonly status: ListingStatus;
  readonly featuredUntil: IsoTimestamp | undefined;
  readonly averageRating: number;
  readonly reviewCount: number;
  readonly orderCount: number;
  readonly relevanceScore: Score;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** A marketplace category for grouping listings. */
export interface Category {
  readonly id: CategoryId;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId: CategoryId | undefined;
  readonly createdAt: IsoTimestamp;
}

/** A tag for cross-cutting classification of listings. */
export interface Tag {
  readonly id: TagId;
  readonly slug: string;
  readonly name: string;
  readonly createdAt: IsoTimestamp;
}

/** A buyer's review of a listing. */
export interface ListingReview {
  readonly id: string;
  readonly listingId: ListingId;
  readonly reviewerAgentId: string;
  readonly rating: number;
  readonly comment: string | undefined;
  readonly createdAt: IsoTimestamp;
}

/** Aggregated rating statistics for a listing. */
export interface RatingSummary {
  readonly listingId: ListingId;
  readonly averageRating: number;
  readonly reviewCount: number;
  readonly distribution: Readonly<Record<1 | 2 | 3 | 4 | 5, number>>;
}

/** A moderation case opened when a listing needs review before publishing. */
export interface ModerationCase {
  readonly id: ModerationCaseId;
  readonly listingId: ListingId;
  readonly reviewerId: UserId | undefined;
  readonly verdict: ModerationVerdict | undefined;
  readonly notes: string;
  readonly createdAt: IsoTimestamp;
  readonly resolvedAt: IsoTimestamp | undefined;
}

/** Input for publishing a listing (seller confirms it is ready for review). */
export const publishListingInputSchema = z.object({
  listingId: z.string().min(1),
  sellerId: z.string().min(1),
});
export type PublishListingInput = z.infer<typeof publishListingInputSchema>;

/** Input for unpublishing / withdrawing a listing from the marketplace. */
export const unpublishListingInputSchema = z.object({
  listingId: z.string().min(1),
  actorId: z.string().min(1),
  reason: z.string().min(1).max(500).optional(),
});
export type UnpublishListingInput = z.infer<typeof unpublishListingInputSchema>;

/** Input for a moderator submitting a verdict on a listing. */
export const moderationVerdictInputSchema = z.object({
  caseId: z.string().min(1),
  reviewerId: z.string().min(1),
  verdict: moderationVerdictSchema,
  notes: z.string().max(2000).default(""),
});
export type ModerationVerdictInput = z.infer<typeof moderationVerdictInputSchema>;
