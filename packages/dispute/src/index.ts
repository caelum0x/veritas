// Public surface of @veritas/dispute — re-exports all domain modules.

export {
  type DisputeId,
  newDisputeId,
  DisputeStatus,
  type DisputeStatus as DisputeStatusType,
  DisputeStatusSchema,
  DisputeSchema,
  type Dispute,
  type CreateDisputeInput,
  createDispute,
  updateDispute,
} from "./dispute.js";

export {
  type ArbitrationId,
  newArbitrationId,
  ArbitrationStatus,
  type ArbitrationStatus as ArbitrationStatusType,
  ArbitrationStatusSchema,
  ArbitrationSchema,
  type Arbitration,
  type AssignArbitratorInput,
  assignArbitrator,
  acceptArbitration,
  declineArbitration,
  completeArbitration,
} from "./arbitration.js";

export {
  type ClearDisputeLink,
  linkVerificationToDispute,
  findLinksByVerification,
  findLinksByDispute,
  removeLinksByDispute,
} from "./clear.js";

export {
  DisputeNotFoundError,
  DisputeStateConflictError,
  InvalidDisputeTransitionError,
  DisputeAccessDeniedError,
  DisputeEvidenceValidationError,
} from "./errors.js";

export {
  type EscalationPolicy,
  DEFAULT_ESCALATION_POLICY,
  type EscalationTrigger,
  type EscalationResult,
  nextEscalationLevel,
  shouldEscalate,
  buildEscalation,
} from "./escalation.js";

export {
  type DisputeEvidenceId,
  newDisputeEvidenceId,
  EvidenceKind,
  type EvidenceKind as EvidenceKindType,
  EvidenceKindSchema,
  DisputeEvidenceSchema,
  type DisputeEvidence,
  type CreateEvidenceInput,
  createEvidence,
  validateEvidenceContent,
} from "./evidence.js";

export {
  DisputePolicySchema,
  type DisputePolicy,
  DEFAULT_DISPUTE_POLICY,
  isReasonAllowed,
  filingFee,
  responseDeadline,
  arbitrationDeadline,
} from "./policy.js";

export {
  DISPUTE_REASONS,
  DisputeReasonSchema,
  type DisputeReason,
  type DisputeReasonMeta,
  REASON_META,
  getReasonMeta,
  requiresEvidence,
} from "./reasons.js";

export {
  type ResolutionId,
  newResolutionId,
  ResolutionOutcome,
  type ResolutionOutcome as ResolutionOutcomeType,
  ResolutionOutcomeSchema,
  ResolutionSchema,
  type Resolution,
  type CreateResolutionInput,
  createResolution,
  type ApplyResolutionResult,
  applyResolution,
  labelOutcome,
} from "./resolution.js";

export {
  isTransitionAllowed,
  transition,
  isTerminal,
  requiresArbitrator,
} from "./state-machine.js";

export {
  type TimelineEventKind,
  type TimelineEvent,
  appendEvent,
  buildStateChangeEvent,
  buildEscalationEvent,
  eventsForDispute,
  latestEvent,
} from "./timeline.js";
