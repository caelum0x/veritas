// Public surface re-export for @veritas/waf: WAF rules, rulesets, signatures, and types
export {
  RuleActionSchema,
  type RuleAction,
  RuleConditionSchema,
  type RuleCondition,
  RuleSchema,
  type Rule,
  CreateRuleSchema,
  type CreateRule,
  makeRule,
  matchesCondition,
  evaluateRule,
} from "./rule.js";

export {
  RulesetSchema,
  type Ruleset,
  CreateRulesetSchema,
  type CreateRuleset,
  makeRuleset,
  addRule,
  removeRule,
  updateRule,
  enableRule,
  disableRule,
  getEnabledRules,
  mergeRulesets,
} from "./ruleset.js";

export {
  type SignatureCategory,
  type AttackSignature,
  ALL_SIGNATURES,
  getSignaturesByCategory,
  testSignatures,
  signatureToCondition,
} from "./signatures.js";

export {
  HttpMethodSchema,
  type HttpMethod,
  WafRequestSchema,
  type WafRequest,
  type DecisionOutcome,
  type WafDecision,
  WafConfigSchema,
  type WafConfig,
  GeoRuleSchema,
  type GeoRule,
  IpReputationEntrySchema,
  type IpReputationEntry,
  RateRuleSchema,
  type RateRule,
  type WafMiddlewareOptions,
} from "./types.js";
