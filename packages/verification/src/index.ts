// Public re-exports for the @veritas/verification package.

// Engine
export { runVerification } from "./engine.js";
export type { VerificationResult } from "./engine.js";
export type {
  EngineOptions,
  InputGuard,
  ConfidenceCalibrator,
  CitationRefiner,
  CitationLike,
  GuardDecision,
  DomainVerifierRouter,
  DomainVerdict,
} from "./engine-options.js";

// Pipeline
export type { Stage } from "./pipeline/stage.js";
export type { VerificationContext } from "./pipeline/context.js";
export { composePipeline } from "./pipeline/pipeline.js";

// Stages
export { guardInputStage } from "./stages/guard.js";
export { normalizeStage } from "./stages/normalize.js";
export { resolveClaimsStage } from "./stages/resolve-claims.js";
export { dedupeClaimsStage } from "./stages/dedupe-claims.js";
export { researchStage } from "./stages/research.js";
export { adjudicateStage } from "./stages/adjudicate.js";
export { domainVerifyStage } from "./stages/domain-verify.js";
export { refineCitationsStage } from "./stages/refine-citations.js";
export { calibrateStage } from "./stages/calibrate.js";
export { scoreStage } from "./stages/score.js";
export { assembleStage } from "./stages/assemble.js";

// Scoring
export { computeTrustScore } from "./scoring/trust-score.js";
export { normalizeConfidence } from "./scoring/confidence.js";
export { VERDICT_WEIGHTS } from "./scoring/weights.js";

// Provenance
export { canonicalJson } from "./provenance/canonical.js";
export { hashProvenance } from "./provenance/hash.js";
export { buildAttestation } from "./provenance/attestation.js";
export type { ProvenanceSignature } from "./provenance/signature.js";

// Report
export { buildReport } from "./report/builder.js";
export { buildSummary } from "./report/summary.js";
export { renderMarkdown } from "./report/markdown.js";

// Source
export { rankSources } from "./source/ranking.js";
export { dedupeByUrl } from "./source/dedupe.js";
export { applyDomainFilter } from "./source/domain-filter.js";

// Claim
export { splitClaim, splitClaims } from "./claim/splitter.js";
export type { SplitClaim } from "./claim/splitter.js";
export { normalizeClaim, normalizeClaims } from "./claim/normalizer.js";

// Concurrency
export {
  boundedMap,
  boundedRecord,
  fanOut,
  createLimiter,
  DEFAULT_CONCURRENCY,
} from "./concurrency.js";

// Errors
export {
  ClaimParseError,
  EvidenceGatherError,
  AdjudicationError,
  PipelineError,
  SourceError,
  ReportAssemblyError,
  ProvenanceError,
  isVerificationError,
} from "./errors.js";
export type { VerificationError } from "./errors.js";
