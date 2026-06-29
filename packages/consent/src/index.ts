// Public surface of @veritas/consent: re-exports all consent module symbols.

export {
  type ConsentId,
  newConsentId,
  ConsentStatusSchema,
  type ConsentStatus,
  ConsentSchema,
  type Consent,
  CreateConsentSchema,
  type CreateConsent,
  makeConsent,
} from "./consent.js";

export {
  type PurposeId,
  newPurposeId,
  LegalBasisSchema,
  type LegalBasis,
  PurposeSchema,
  type Purpose,
  CreatePurposeSchema,
  type CreatePurpose,
  makePurpose,
  deactivatePurpose,
} from "./purpose.js";

export {
  ConsentChannelSchema,
  type ConsentChannel,
  ConsentScopeSchema,
  type ConsentScope,
  WithdrawalReasonSchema,
  type WithdrawalReason,
  ConsentSummarySchema,
  type ConsentSummary,
  ConsentMetaSchema,
  type ConsentMeta,
  ConsentChangedEventSchema,
  type ConsentChangedEvent,
} from "./types.js";
