// Re-exports the public surface of the @veritas/segmentation module.
export type { SegmentId, TraitKey, TraitValue, TraitMap, SegmentKind } from "./types.js";
export { SegmentIdSchema, TraitKeySchema, TraitMapSchema } from "./types.js";

export type { RuleOperator, Rule, RuleGroup } from "./rule.js";
export { RuleSchema, RuleGroupSchema, parseRuleGroup, evaluateRule } from "./rule.js";

export type { UserTraits } from "./trait.js";
export { parseUserTraits, getTrait, mergeTrait } from "./trait.js";

export {
  SegmentNotFoundError,
  SegmentConflictError,
  InvalidRuleError,
  MembershipNotFoundError,
} from "./errors.js";
