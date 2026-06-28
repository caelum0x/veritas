// Evaluates whether a user's traits satisfy a segment's rule group.
import { type Result, ok } from "@veritas/core";
import { RuleGroup, evaluateRule } from "./rule.js";
import { UserTraits, getTrait } from "./trait.js";
import { Segment } from "./segment.js";

export interface EvaluationResult {
  readonly segmentId: string;
  readonly userId: string;
  readonly matched: boolean;
  readonly evaluatedAt: string;
}

/** Check if user traits satisfy a rule group. Pure, no side effects. */
export function matchesRuleGroup(ruleGroup: RuleGroup, traits: UserTraits): boolean {
  const { conjunction, rules } = ruleGroup;
  if (conjunction === "and") {
    return rules.every((rule) => evaluateRule(rule, getTrait(traits, rule.trait)));
  }
  return rules.some((rule) => evaluateRule(rule, getTrait(traits, rule.trait)));
}

/** Evaluate a single segment against user traits, returning a typed result. */
export function evaluateSegment(
  segment: Segment,
  traits: UserTraits,
  now: string
): Result<EvaluationResult, never> {
  const matched = matchesRuleGroup(segment.ruleGroup, traits);
  return ok(
    Object.freeze({
      segmentId: segment.id,
      userId: traits.userId,
      matched,
      evaluatedAt: now,
    })
  );
}

/** Batch-evaluate multiple segments against a single user, returning only matched ids. */
export function evaluateSegments(
  segments: ReadonlyArray<Segment>,
  traits: UserTraits,
  now: string
): ReadonlyArray<EvaluationResult> {
  return segments.map((seg) => {
    const matched = matchesRuleGroup(seg.ruleGroup, traits);
    return Object.freeze({ segmentId: seg.id, userId: traits.userId, matched, evaluatedAt: now });
  });
}
