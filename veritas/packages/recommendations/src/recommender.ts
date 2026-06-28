// Recommender port — interface all recommendation strategies must implement.

import type { Result } from "@veritas/core";
import type { RecommendableItem } from "./item.js";
import type { RecommendationError } from "./errors.js";

export interface RecommendRequest {
  /** ID of the user or entity requesting recommendations. */
  readonly principalId: string;
  /** Optional seed items to base recommendations on. */
  readonly seedItemIds?: readonly string[];
  /** Maximum number of recommendations to return. */
  readonly limit?: number;
  /** Restrict to a specific item kind. */
  readonly kind?: string;
  /** Arbitrary filter metadata passed through to the strategy. */
  readonly filters?: Record<string, unknown>;
}

export interface Recommendation {
  readonly item: RecommendableItem;
  /** Score in [0,1]; higher is more relevant. */
  readonly score: number;
  /** Human-readable explanation of why this was recommended. */
  readonly reason: string;
}

export interface RecommendResult {
  readonly recommendations: readonly Recommendation[];
  readonly strategy: string;
}

/** Port that every recommendation strategy implements. */
export interface Recommender {
  readonly strategyName: string;
  recommend(
    request: RecommendRequest
  ): Promise<Result<RecommendResult, RecommendationError>>;
}
