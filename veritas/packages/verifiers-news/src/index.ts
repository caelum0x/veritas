// Public surface of @veritas/verifiers-news.
export { NewsVerifier } from "./verifier.js";

export { applyNewsRules, checkOutletCredibility, checkCorroboration, checkWireConfirmation, checkRecency } from "./rules.js";

export { computeNewsScore } from "./scoring.js";

export { canHandleNewsClaim, extractOutlets, extractAttributions, newsRelevanceScore } from "./matcher.js";

export { makeNewsEvidenceResult } from "./evidence.js";
export type {
  OutletEvidence,
  CrossSourceEvidence,
  RecencyEvidence,
  WireEvidence,
  NewsEvidence,
  NewsEvidenceResult,
} from "./evidence.js";
export { OutletEvidenceSchema, CrossSourceEvidenceSchema, RecencyEvidenceSchema, WireEvidenceSchema } from "./evidence.js";

export { makeNewsSignals } from "./signals.js";

export { buildOutletExtractionPrompt, buildNewsStancePrompt, buildCredibilityCheckPrompt } from "./prompts.js";

export {
  NewsDataUnavailableError,
  OutletNotFoundError,
  WireServiceUnavailableError,
  NewsClaimAmbiguousError,
  RecencyCheckFailedError,
  CrossSourceResolutionError,
} from "./errors.js";

export type {
  OutletTier,
  WireService,
  OutletRecord,
  NewsArticle,
  WireReport,
  ParsedNewsClaim,
  NewsRuleResult,
  NewsScoreBreakdown,
} from "./types.js";
export {
  OutletTierSchema,
  WireServiceSchema,
  OutletRecordSchema,
  NewsArticleSchema,
  WireReportSchema,
  ParsedNewsClaimSchema,
  NewsRuleResultSchema,
  NewsScoreBreakdownSchema,
} from "./types.js";

export type { OutletRegistryPort } from "./sources/outlet-registry.js";
export { MockOutletRegistryDataSource, OutletRegistryDataSource, createOutletRegistrySource } from "./sources/outlet-registry.js";

export type { CrossSourcePort } from "./sources/cross-source.js";
export { MockCrossSourceDataSource, CrossSourceDataSource, createCrossSource } from "./sources/cross-source.js";

export type { RecencyPort } from "./sources/recency.js";
export { MockRecencyDataSource, RecencyDataSource, createRecencySource } from "./sources/recency.js";

export type { WireDataSourcePort } from "./sources/wire.js";
export { MockWireDataSource, WireDataSource, createWireSource } from "./sources/wire.js";
