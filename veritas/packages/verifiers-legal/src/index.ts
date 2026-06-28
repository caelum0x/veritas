// Public surface of @veritas/verifiers-legal.
export { LegalVerifier } from "./verifier.js";

export {
  checkStatuteActive,
  checkCaseNotOverruled,
  checkJurisdictionMatch,
  checkStatuteYearAlignment,
  checkCaseYearConsistency,
  applyLegalRules,
} from "./rules.js";

export { computeLegalScore } from "./scoring.js";

export { canHandleLegalClaim, legalRelevanceScore, extractJurisdictions, extractCaseCitations } from "./matcher.js";

export {
  makeLegalEvidenceResult,
} from "./evidence.js";

export { makeLegalSignals } from "./signals.js";

export {
  buildLegalAnalysisPrompt,
  buildJurisdictionExtractionPrompt,
  buildLegalStancePrompt,
  LEGAL_SYSTEM_PROMPT,
} from "./prompts.js";

export {
  StatuteNotFoundError,
  CaseLawNotFoundError,
  JurisdictionUnknownError,
  LegalDataUnavailableError,
  LegalCitationParseError,
  LegalClaimAmbiguousError,
  StatuteRepealedError,
} from "./errors.js";

export type {
  LegalClaimCategory,
  JurisdictionLevel,
  ParsedLegalClaim,
  StatuteRecord,
  CaseLawRecord,
  JurisdictionRecord,
  LegalRuleResult,
  LegalScoreBreakdown,
} from "./types.js";

export {
  LegalClaimCategorySchema,
  JurisdictionLevelSchema,
  ParsedLegalClaimSchema,
  StatuteRecordSchema,
  CaseLawRecordSchema,
  JurisdictionRecordSchema,
  LegalRuleResultSchema,
  LegalScoreBreakdownSchema,
} from "./types.js";

export type { StatuteSourcePort, StatuteQuery } from "./sources/statute.js";
export { MockStatuteSource } from "./sources/statute.js";

export type { CaseLawSourcePort, CaseLawQuery } from "./sources/case-law.js";
export { MockCaseLawSource } from "./sources/case-law.js";

export type { JurisdictionSourcePort, JurisdictionQuery } from "./sources/jurisdiction.js";
export { MockJurisdictionSource } from "./sources/jurisdiction.js";
