// Flag evaluator: resolves a flag value for a given evaluation context

import type { FeatureFlag, FlagEvaluationResult, FlagVariant } from "./flag.js";
import type { EvaluationContext } from "./context.js";
import { matchTargetingRule } from "./rules.js";
import { isInRollout } from "./rollout.js";

function findVariant<T>(
  flag: FeatureFlag<T>,
  variantKey: string
): FlagVariant<T> | undefined {
  return flag.variants.find((v) => v.key === variantKey);
}

function defaultResult<T>(flag: FeatureFlag<T>): FlagEvaluationResult<T> {
  const variant = findVariant(flag, flag.defaultVariant);
  return {
    flagKey: flag.key,
    value: variant?.value as T,
    variantKey: flag.defaultVariant,
    reason: "DEFAULT",
  };
}

function disabledResult<T>(flag: FeatureFlag<T>): FlagEvaluationResult<T> {
  const variant = findVariant(flag, flag.defaultVariant);
  return {
    flagKey: flag.key,
    value: variant?.value as T,
    variantKey: flag.defaultVariant,
    reason: "DISABLED",
  };
}

/** Evaluate a feature flag for the given context, returning the resolved variant */
export function evaluate<T>(
  flag: FeatureFlag<T>,
  ctx: EvaluationContext
): FlagEvaluationResult<T> {
  if (!flag.enabled) {
    return disabledResult(flag);
  }

  // Evaluate targeting rules in order; first match wins
  const matchedRule = matchTargetingRule(flag.targetingRules, ctx);

  if (matchedRule !== undefined) {
    // If the rule has a rollout percentage, check if the context key is in the rollout
    if (
      matchedRule.rolloutPercentage !== undefined &&
      !isInRollout(flag.key, ctx.key, matchedRule.rolloutPercentage)
    ) {
      return defaultResult(flag);
    }

    const variant = findVariant(flag, matchedRule.serve);
    if (variant === undefined) {
      return defaultResult(flag);
    }

    return {
      flagKey: flag.key,
      value: variant.value,
      variantKey: variant.key,
      reason: "TARGETING_MATCH",
      ruleId: matchedRule.id,
    };
  }

  return defaultResult(flag);
}

/** Evaluate a boolean flag, defaulting to false on any error */
export function evaluateBoolean(
  flag: FeatureFlag<boolean>,
  ctx: EvaluationContext
): boolean {
  return evaluate(flag, ctx).value;
}

/** Evaluate a string flag, returning the default string on any error */
export function evaluateString(
  flag: FeatureFlag<string>,
  ctx: EvaluationContext
): string {
  return evaluate(flag, ctx).value;
}
