// Public surface of @veritas/verifier-kit: domain-intelligence & quality verifier primitives.

export type { SpecializedVerifier, VerifiableClaim as SpecializedVerifiableClaim, VerifierOutput } from "./specialized-verifier.js";

export type { VerifierContext } from "./context.js";
export { requireSource, makeVerifierContext } from "./context.js";

export {
  EvidenceStanceSchema,
  DomainEvidenceSchema,
  makeEvidenceBundle,
} from "./evidence.js";
export type { EvidenceStance, DomainEvidence, EvidenceBundle } from "./evidence.js";

export { verdictSignalSchema, makeVerdictSignal } from "./signal.js";
export type { VerdictSignal } from "./signal.js";

export { aggregateSignals } from "./aggregate-signals.js";
export type { AggregatedVerdict as AggregatedVerdictResult } from "./aggregate-signals.js";

export type { DataSourcePort, SourceDocument, SourceQuery } from "./source-port.js";

export { MockDataSource, createMockSource } from "./mock-source.js";
export type { MockSourceEntry } from "./mock-source.js";

export { VerifierCache } from "./cache.js";
export type { VerifierCacheOptions } from "./cache.js";

export {
  EvidenceItemSchema,
  VerdictSignalSchema,
  VerifierResultSchema,
  makeVerifierResult,
  deriveVerdict,
} from "./result.js";
export type { EvidenceItem, VerifierResult } from "./result.js";

export {
  VerifierNotFoundError,
  NoVerifierAvailableError,
  VerifierTimeoutError,
  SourceUnavailableError,
  RateLimitExceededError,
  CacheWriteError,
  VerifierResultInvalidError,
} from "./errors.js";

export {
  asVerifierId,
  ClaimDomainSchema,
  ConfidenceLevelSchema,
  VerifiableClaimSchema,
  FetchOptionsSchema,
  SignalWeightSchema,
  AggregatedVerdictSchema,
  RateLimitConfigSchema,
} from "./types.js";
export type {
  VerifierId,
  ClaimDomain,
  ConfidenceLevel,
  VerifiableClaim,
  FetchOptions,
  SignalWeight,
  AggregatedVerdict,
  CacheEntry,
  RateLimitConfig,
} from "./types.js";
