// Match buyer needs to marketplace listings using keyword and tag overlap scoring.

import { z } from "zod";
import type { Score } from "@veritas/core";
import { clampScore } from "@veritas/core";
import type { Listing } from "./types.js";

/** Buyer requirements used to find matching listings. */
export interface BuyerNeeds {
  readonly keywords: ReadonlyArray<string>;
  readonly tagIds: ReadonlyArray<string>;
  readonly categoryId?: string;
  readonly minRelevance?: number;
}

/** Zod schema for BuyerNeeds. */
export const buyerNeedsSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
  tagIds: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
});

/** A listing paired with its match relevance score. */
export interface MatchResult {
  readonly listing: Listing;
  readonly relevance: Score;
}

/** Compute normalised keyword overlap between query terms and listing text fields. */
function keywordOverlap(
  keywords: ReadonlyArray<string>,
  listing: Listing,
): number {
  if (keywords.length === 0) return 0;
  const haystack = [listing.title, listing.summary, listing.description]
    .join(" ")
    .toLowerCase();
  const hits = keywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
  return hits / keywords.length;
}

/** Compute normalised tag overlap between query tag ids and listing tag ids. */
function tagOverlap(
  tagIds: ReadonlyArray<string>,
  listing: Listing,
): number {
  if (tagIds.length === 0) return 0;
  const listingTags = new Set(listing.tagIds.map((t) => t.toLowerCase()));
  const hits = tagIds.filter((t) => listingTags.has(t.toLowerCase())).length;
  return hits / tagIds.length;
}

/** Match listings to buyer needs, returning results sorted by descending relevance. */
export function matchListings(
  needs: BuyerNeeds,
  listings: ReadonlyArray<Listing>,
): ReadonlyArray<MatchResult> {
  const results: MatchResult[] = [];

  for (const listing of listings) {
    if (listing.status !== "published") continue;
    if (needs.categoryId !== undefined && listing.categoryId !== needs.categoryId) continue;

    const kwScore = keywordOverlap(needs.keywords, listing);
    const tagScore = tagOverlap(needs.tagIds, listing);
    // Weighted average: keywords 70%, tags 30%
    const relevance = clampScore(kwScore * 0.7 + tagScore * 0.3);

    if (needs.minRelevance !== undefined && relevance < needs.minRelevance) continue;

    results.push({ listing, relevance });
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/** Return the top-N match results. */
export function topMatches(
  results: ReadonlyArray<MatchResult>,
  n: number,
): ReadonlyArray<MatchResult> {
  return results.slice(0, Math.max(0, n));
}
