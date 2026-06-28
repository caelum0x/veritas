// index: public surface of the agent-orchestrator module.

export type {
  EffortLevel,
  StrategyKind,
  AgentCandidate,
  DispatchFn,
  FanOutOptions,
  FanOutOutcome,
  FanOutResult,
  EscalationLevel,
  EscalationPolicy,
  PipelineStep,
  ExecutionPlan,
  StepStatus,
  StepState,
  PipelineResult,
  OrchestratorSummary,
  StepMeta,
  ConsensusOptions,
  ConsensusResult,
} from "./types.js";

export {
  NoAgentFoundError,
  ConsensusNotReachedError,
  PipelineStepError,
  AgentTimeoutError,
  PlanBuildError,
  AllAgentsFailedError,
} from "./errors.js";

export type { WeightedReport, AggregationOptions, AggregatedResult } from "./aggregate-verdicts.js";
export { aggregateVerdicts } from "./aggregate-verdicts.js";

export type {
  CAPAgentRequest,
  CAPAgentResponse,
  HttpTransport,
} from "./cap-agent-client.js";
export { CAPAgentClient, NoopHttpTransport, createCAPAgentClient } from "./cap-agent-client.js";

export { fanOut } from "./strategies/fan-out.js";
