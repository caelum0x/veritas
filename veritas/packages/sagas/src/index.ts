// Public surface of @veritas/sagas: saga orchestration primitives and definitions.
export type { SagaStatus, StepRecord, SagaState } from "./state.js";
export {
  updateSagaState,
  updateStep,
  initialSagaState,
} from "./state.js";

export type { SagaContext } from "./context.js";
export { extendSagaContext, createSagaContext } from "./context.js";

export {
  SagaNotFoundError,
  SagaAlreadyCompletedError,
  SagaCompensationError,
  SagaStepError,
} from "./errors.js";

export type { SagaStep } from "./step.js";
export type { Saga } from "./saga.js";
export type { SagaStorePort } from "./store.js";
export { InMemorySagaStore } from "./store.js";
export { SagaOrchestrator } from "./orchestrator.js";
export { SagaBuilder } from "./builder.js";
export { runCompensation } from "./compensation.js";
export { withStepRetry } from "./retry.js";

export { verifyAndSettleSaga } from "./definitions/verify-and-settle.saga.js";
export { onboardAgentSaga } from "./definitions/onboard-agent.saga.js";
export { monthlyBillingSaga } from "./definitions/monthly-billing.saga.js";
export { disputeResolutionSaga } from "./definitions/dispute-resolution.saga.js";
export { createRefundAndCreditSaga } from "./definitions/refund-and-credit.saga.js";
export type { RefundAndCreditSagaDef } from "./definitions/refund-and-credit.saga.js";
