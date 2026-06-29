// Public surface re-export for @veritas/autoscaling.
export type {
  ScalingSignal,
  PolicyEvalResult,
  ScalingPolicy,
  ManagedResource,
  CapacityBackend,
} from './types.js';
export { InMemoryCapacityBackend } from './types.js';

export type { SignalId, SignalKind, Signal, CreateSignal, SignalRepository } from './signal.js';
export {
  signalId,
  SignalKindSchema,
  SignalSchema,
  CreateSignalSchema,
  InMemorySignalRepository,
} from './signal.js';

export type { PolicyId, ScalingDirection, ThresholdCondition, TargetTrackingCondition, PolicyCondition, Policy, CreatePolicy, PolicyRepository } from './policy.js';
export {
  policyId,
  ScalingDirectionSchema,
  ThresholdConditionSchema,
  TargetTrackingConditionSchema,
  PolicyConditionSchema,
  PolicySchema,
  CreatePolicySchema,
  InMemoryPolicyRepository,
} from './policy.js';

export type { ScaleDirection, ScaleDecision } from './decision.js';
export { ScaleDirectionSchema, ScaleDecisionSchema, makeScaleDecision, noopDecision } from './decision.js';

export type { CapacityLimits } from './limits.js';
export {
  CapacityLimitsSchema,
  makeCapacityLimits,
  clampCapacity,
  assertWithinLimits,
  isAtMin,
  isAtMax,
} from './limits.js';

export type { MetricTarget, MetricTargetAssessment } from './metric-target.js';
export {
  MetricTargetSchema,
  assessMetricTarget,
  computeDesiredReplicas,
} from './metric-target.js';

export type { DataPoint, PredictorConfig, Predictor } from './predictor.js';
export { DataPointSchema, PredictorConfigSchema, makePredictor } from './predictor.js';

export type { EvaluatorOptions, Evaluator } from './evaluator.js';
export { makeEvaluator } from './evaluator.js';

export {
  ScalingPolicyError,
  CooldownActiveError,
  LimitsViolationError,
  InsufficientDataError,
  EvaluatorError,
} from './errors.js';
