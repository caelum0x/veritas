// Public surface of @veritas/quality-gates: gate interface, pipeline, results, severity, and built-in gates.

export type { QualityGate, GateInput } from "./gate.js";
export type { GateResult, GateFinding } from "./result.js";
export { passed, failed } from "./result.js";
export type { Severity } from "./severity.js";
export {
  SEVERITIES,
  SEVERITY_RANK,
  atLeast,
  maxSeverity,
  isBlocking,
} from "./severity.js";
export type { PipelineOutcome } from "./pipeline.js";
export { runPipeline } from "./pipeline.js";
