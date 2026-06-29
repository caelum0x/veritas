// Public surface of @veritas/orchestration: registry, runners, adapters, and errors.
export { OrchestrationRegistry } from "./registry.js";

export {
  OrchestrationNotFoundError,
  OrchestrationAlreadyRegisteredError,
  OrchestrationExecutionError,
  OrchestrationScheduleError,
} from "./errors.js";

export type {
  OrchestrationKind,
  OrchestrationEntry,
  SagaEntry,
  WorkflowEntry,
  LongRunningEntry,
  OrchestrationHandle,
  OrchestrationConfig,
  ScheduleDescriptor,
} from "./types.js";

export {
  registerBuiltInSagas,
  type BuiltInSagaPorts,
  type VerifyAndSettlePorts,
  type OnboardAgentPorts,
  type MonthlyBillingPorts,
  type DisputeResolutionPorts,
} from "./register-sagas.js";

export { SagaRunner, type SagaRunnerDeps, type SagaRunResult } from "./saga-runner.js";

export {
  flowToSaga,
  noopFlowStep,
  inlineFlowStep,
  requireContextKey,
  type FlowStep,
  type FlowToSagaOptions,
} from "./flow-to-saga.js";

export {
  LongRunningOrchestrator,
  type LongRunningDeps,
  type LongRunningHandle,
} from "./long-running.js";

export {
  SchedulerBridge,
  type SchedulerBridgeDeps,
} from "./scheduler-bridge.js";
