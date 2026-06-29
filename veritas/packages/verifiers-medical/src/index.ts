// Public surface of @veritas/verifiers-medical: medical domain fact-verification module.

export { MedicalVerifier } from "./verifier.js";

export {
  isMedicalClaim,
  classifyMedicalDomain,
  extractMedicalClaimFacts,
  hasStatisticalAssertion,
  referencesDrug,
} from "./rules.js";

export {
  computeMedicalConfidence,
  scoreFromGrade,
  gradeToWeight,
  drugApprovalModifier,
  applyDrugModifier,
} from "./scoring.js";

export {
  DrugNotFoundError,
  IcdCodeNotFoundError,
  GuidelineNotFoundError,
  MedicalSourceUnavailableError,
  InsufficientMedicalEvidenceError,
} from "./errors.js";

export {
  MedicalClaimDomainSchema,
  EvidenceGradeSchema,
  IcdCodeSchema,
  DrugEntrySchema,
  GuidelineSchema,
} from "./types.js";
export type {
  MedicalClaimDomain,
  EvidenceGrade,
  IcdCode,
  DrugEntry,
  Guideline,
  MedicalClaimFacts,
  MedicalEvidenceSummary,
} from "./types.js";

export type { MedicalEvidence } from "./evidence.js";

export {
  makeDrugDbSignal,
  makeGuidelinesSignal,
  makeIcdSignal,
  makeEvidenceGradeSignal,
  makeMedicalSignals,
} from "./signals.js";

export {
  MEDICAL_SYSTEM_PROMPT,
  buildMedicalAnalysisPrompt,
  buildDrugExtractionPrompt,
  buildMedicalStancePrompt,
  buildEvidenceGradePrompt,
} from "./prompts.js";

export { canHandleMedicalClaim, extractDrugNames, medicalRelevanceScore } from "./matcher.js";

export type { DrugDbPort, DrugRecord } from "./sources/drug-db.js";
export { MockDrugDb } from "./sources/drug-db.js";

// Real, network-backed drug source (openFDA, keyless).
export { OpenFdaDrugSource, createOpenFdaDrugSource } from "./sources/openfda-drug.js";
export type { OpenFdaDrugSourceOptions } from "./sources/openfda-drug.js";

export type { GuidelinesPort } from "./sources/guidelines.js";
export { MockGuidelinesSource } from "./sources/guidelines.js";

export type { IcdPort, IcdCodeEntry } from "./sources/icd.js";
export { MockIcdSource } from "./sources/icd.js";

// Real, network-backed ICD-10-CM source (NLM Clinical Tables, keyless).
export { NlmIcdSource, createNlmIcdSource } from "./sources/nlm-icd.js";
export type { NlmIcdSourceOptions } from "./sources/nlm-icd.js";

export type { EvidenceGradePort } from "./sources/evidence-grade.js";
export { MockEvidenceGradeSource } from "./sources/evidence-grade.js";
