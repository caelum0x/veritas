// Public surface of @veritas/policy: rules, conditions, actions, decisions, errors, and types.
export type { Rule, CreateRule } from './rule.js';
export { makeRule, withPriority, withEnabled, sortByPriority } from './rule.js';

export type {
  ConditionKind,
  Condition,
  FieldEqCondition,
  FieldNeqCondition,
  FieldGtCondition,
  FieldGteCondition,
  FieldLtCondition,
  FieldLteCondition,
  FieldInCondition,
  FieldContainsCondition,
  FieldExistsCondition,
  AndCondition,
  OrCondition,
  NotCondition,
  AlwaysCondition,
  NeverCondition,
} from './condition.js';
export {
  evaluateCondition,
  always,
  never,
  fieldEq,
  fieldNeq,
  fieldGt,
  fieldGte,
  fieldLt,
  fieldLte,
  fieldIn,
  fieldContains,
  fieldExists,
  and,
  or,
  not,
} from './condition.js';

export type {
  ActionKind,
  Action,
  AllowAction,
  DenyAction,
  RequireReviewAction,
  FlagAction,
  SetFieldAction,
  NotifyAction,
  EscalateAction,
  AuditLogAction,
} from './action.js';
export {
  allow,
  deny,
  requireReview,
  flag,
  setField,
  notify,
  escalate,
  auditLog,
  isDenyAction,
  isAllowAction,
} from './action.js';

export type { DecisionOutcome, RuleDecision, Decision } from './decision.js';
export {
  makeDecision,
  makeRuleDecision,
  isAllowed,
  isDenied,
  isNotApplicable,
  triggeredRules,
} from './decision.js';

export type {
  Facts,
  PolicyPrincipal,
  EvalMeta,
  VerificationFacts,
  CombinationStrategy,
  PolicyRef,
} from './types.js';

export {
  PolicyNotFoundError,
  InvalidRuleError,
  DslParseError,
  EvaluationConflictError,
  PolicyVersionConflictError,
} from './errors.js';

export {
  autoAllowRule,
  autoDenyRule,
  conflictingEvidenceRule,
  insufficientSourcesRule,
  escalationOverrideRule,
  auditAllRule,
  defaultVerificationRules,
} from './verification-rules.js';
