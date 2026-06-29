// Public surface of @veritas/verifiers-scientific: scientific fact-verification module.
export { ScientificVerifier } from "./verifier.js";

export { isScientificClaim, extractDoi, extractPmid, extractArxivId, extractSearchKeywords } from "./matcher.js";

export {
  makeScientificEvidenceResult,
} from "./evidence.js";
export type {
  ScientificEvidence,
  ScientificEvidenceResult,
  PubMedEvidence,
  CrossrefEvidence,
  ArxivEvidence,
  RetractionEvidence,
} from "./evidence.js";

export {
  peerReviewedSupportSignal,
  retractionRefuteSignal,
  preprintSupportSignal,
  noLiteratureSignal,
  highCitationBoostSignal,
  conflictingLiteratureSignal,
} from "./signals.js";

export {
  SCIENTIFIC_SYSTEM_PROMPT,
  buildAdjudicationPrompt,
  buildKeywordExtractionPrompt,
  buildConsensusPrompt,
} from "./prompts.js";

export {
  hasHighImpactSupport,
  hasRetractedSource,
  isPreprintOnly,
  hasContradiction,
  isEstablishedPaper,
  isValidPeerReviewedSource,
  peerReviewWeight,
  hasNoIdentifiableSources,
  hasReplicationEvidence,
  hasSufficientEvidence,
  MIN_PAPERS_FOR_HIGH_CONFIDENCE,
} from "./rules.js";

export {
  scorePaper,
  computeScientificConfidence,
  computeSupportRatio,
  aggregatePaperScores,
  computeSignalWeight,
} from "./scoring.js";

export {
  PubMedUnavailableError,
  CrossrefUnavailableError,
  ArxivUnavailableError,
  DoiResolutionError,
  RetractionCheckError,
  ScientificClaimParseError,
} from "./errors.js";

export {
  ScientificDomainSchema,
  PublicationStatusSchema,
  PeerReviewTierSchema,
  PaperMetadataSchema,
  ParsedScientificClaimSchema,
  ScientificVerdictContextSchema,
} from "./types.js";
export type {
  ScientificDomain,
  PublicationStatus,
  PeerReviewTier,
  PaperMetadata,
  ParsedScientificClaim,
  ScientificVerdictContext,
} from "./types.js";

export type { PubMedDataSourcePort as PubMedPort, PubMedArticleMetadata as PubMedArticle } from "./sources/pubmed.js";
export { MockPubMedDataSource as MockPubMedSource, createPubMedSource as createMockPubMedSource } from "./sources/pubmed.js";

export type { CrossrefDataSourcePort as CrossrefPort, CrossrefArticleMetadata as CrossrefWork } from "./sources/crossref.js";
export { MockCrossrefDataSource as MockCrossrefSource, createCrossrefSource as createMockCrossrefSource } from "./sources/crossref.js";

export type { DoiDataSourcePort as DoiPort, DoiMetadata as DoiRecord } from "./sources/doi.js";
export { MockDoiDataSource as MockDoiSource, createDoiSource as createMockDoiSource } from "./sources/doi.js";

export type { RetractionDataSourcePort as RetractionPort, RetractionMetadata as RetractionRecord } from "./sources/retraction.js";
export { MockRetractionDataSource as MockRetractionSource, createRetractionSource as createMockRetractionSource } from "./sources/retraction.js";

export type { ArxivDataSourcePort as ArxivPort, ArxivPaperMetadata as ArxivPaper } from "./sources/arxiv.js";
export { MockArxivDataSource as MockArxivSource, createArxivSource as createMockArxivSource } from "./sources/arxiv.js";

// Real, network-backed data source adapters (no mocks). `create*Source()` returns
// the live adapter; pass `mock: true` only in tests.
export { CrossrefDataSource, createCrossrefSource } from "./sources/crossref.js";
export { ArxivDataSource, createArxivSource } from "./sources/arxiv.js";
export { PubMedDataSource, createPubMedSource } from "./sources/pubmed.js";
export { RetractionDataSource, createRetractionSource } from "./sources/retraction.js";
export { DoiDataSource, createDoiSource } from "./sources/doi.js";
