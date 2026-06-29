// Public surface of @veritas/recommendations — re-exports all module symbols.

export type { ItemKind, RecommendableItem } from "./item.js";
export { ItemKindSchema, RecommendableItemSchema, makeItem, withEmbedding, hasEmbedding } from "./item.js";

export type {
  RecommendationContext,
  Recommendation,
  RecommendationResult,
  FeedbackKind,
  Feedback,
  SimilarityResult,
  RankedCandidate,
} from "./types.js";
export {
  RecommendationContextSchema,
  RecommendationSchema,
  RecommendationResultSchema,
  FeedbackKindSchema,
  FeedbackSchema,
  SimilarityResultSchema,
  RankedCandidateSchema,
} from "./types.js";
