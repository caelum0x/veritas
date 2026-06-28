// Shared types and interfaces for the datasource package.

import type { Score } from "@veritas/core";
import type { Source } from "@veritas/contracts";
import type { SourceTier } from "@veritas/core";

/** Options for querying sources from the store. */
export interface SourceQuery {
  readonly domain?: string;
  readonly tier?: typeof SourceTier[keyof typeof SourceTier];
  readonly publisher?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** A source enriched with computed authority and credibility scores. */
export interface ScoredSource {
  readonly source: Source;
  readonly authorityScore: Score;
  readonly credibilityScore: Score;
}

/** Allowlist entry for a trusted domain. */
export interface AllowlistEntry {
  readonly domain: string;
  readonly tier: typeof SourceTier[keyof typeof SourceTier];
  readonly addedAt: string;
  readonly note?: string;
}

/** Blocklist entry for a blocked domain. */
export interface BlocklistEntry {
  readonly domain: string;
  readonly reason: string;
  readonly addedAt: string;
}

/** Result of classifying a URL's source type. */
export interface SourceClassification {
  readonly tier: typeof SourceTier[keyof typeof SourceTier];
  readonly category: SourceCategory;
}

/** High-level category assigned to a source. */
export type SourceCategory =
  | "government"
  | "academic"
  | "news"
  | "organization"
  | "social"
  | "blog"
  | "unknown";

/** Link between a source domain and its external reputation record id. */
export interface ReputationLink {
  readonly domain: string;
  readonly reputationId: string;
  readonly linkedAt: string;
}
