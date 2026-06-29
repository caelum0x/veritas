// Public surface re-export for the @veritas/referrals package.
export type {
  ReferralId,
  ReferralCodeId,
  ProgramId,
  RewardId,
  TrackingEventId,
  FraudCheckResult,
  AttributionModel,
  Redemption,
} from "./types.js";

export {
  FraudCheckResultSchema,
  AttributionModelSchema,
  RedemptionSchema,
} from "./types.js";

export {
  type ReferralCode,
  ReferralCodeSchema as ReferralCodeStringSchema,
  generateCode,
  generateUserCode,
  isValidCode,
  normalizeCode,
  formatCodeDisplay,
} from "./code.js";

export {
  type ReferralStatus,
  ReferralStatusSchema,
  type Referral,
  type CreateReferral,
  CreateReferralSchema,
  makeReferral,
  attributeReferral,
  markReferralRewarded,
  markReferralFraud,
} from "./referral.js";

export {
  type RewardType,
  RewardTypeSchema,
  type RewardConfig,
  RewardConfigSchema,
  type ProgramStatus,
  ProgramStatusSchema,
  type ReferralProgram,
  ReferralProgramSchema,
  type CreateProgram,
  CreateProgramSchema,
  makeProgram,
  isProgramActive,
  pauseProgram,
  archiveProgram,
} from "./program.js";

export {
  type AttributionRequest,
  AttributionRequestSchema,
  type AttributionError,
  checkAttributionEligibility,
  performAttribution,
} from "./attribution.js";

export {
  type RewardTarget,
  RewardTargetSchema,
  type Reward,
  RewardSchema,
  type RewardError,
  computeRewards,
  summarizeReward,
} from "./reward.js";

export {
  type TrackingEventType,
  type TrackingEvent,
  type RecordEventInput,
  type TrackingStore,
  InMemoryTrackingStore,
  makeTrackingEvent,
  Tracker,
} from "./tracking.js";

export {
  type ReferralStore,
  InMemoryReferralStore,
} from "./store.js";

export {
  ReferralCodeNotFoundError,
  ReferralNotFoundError,
  SelfReferralError,
  DuplicateReferralError,
  ReferralProgramNotFoundError,
  ReferralProgramInactiveError,
  RewardAlreadyRedeemedError,
  RewardNotEligibleError,
  FraudSuspectedError,
} from "./errors.js";
