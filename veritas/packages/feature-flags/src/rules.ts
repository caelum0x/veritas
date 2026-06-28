// Targeting rule evaluation logic for feature flags

import type { FlagRule, FlagTargetingRule } from "./flag.js";
import type { EvaluationContext } from "./context.js";

function getAttributeValue(ctx: EvaluationContext, attribute: string): unknown {
  // Check top-level context fields first, then fall back to attributes map
  const knownFields: Record<string, unknown> = {
    key: ctx.key,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    email: ctx.email,
    plan: ctx.plan,
    environment: ctx.environment,
  };

  if (attribute in knownFields) {
    return knownFields[attribute];
  }

  return ctx.attributes?.[attribute];
}

function evaluateCondition(rule: FlagRule, ctx: EvaluationContext): boolean {
  const attrValue = getAttributeValue(ctx, rule.attribute);

  switch (rule.operator) {
    case "eq":
      return attrValue === rule.values[0];

    case "neq":
      return attrValue !== rule.values[0];

    case "in":
      return rule.values.includes(attrValue);

    case "nin":
      return !rule.values.includes(attrValue);

    case "gt":
      return typeof attrValue === "number" && typeof rule.values[0] === "number"
        ? attrValue > (rule.values[0] as number)
        : false;

    case "gte":
      return typeof attrValue === "number" && typeof rule.values[0] === "number"
        ? attrValue >= (rule.values[0] as number)
        : false;

    case "lt":
      return typeof attrValue === "number" && typeof rule.values[0] === "number"
        ? attrValue < (rule.values[0] as number)
        : false;

    case "lte":
      return typeof attrValue === "number" && typeof rule.values[0] === "number"
        ? attrValue <= (rule.values[0] as number)
        : false;

    case "contains":
      return typeof attrValue === "string" && typeof rule.values[0] === "string"
        ? attrValue.includes(rule.values[0] as string)
        : false;

    case "startsWith":
      return typeof attrValue === "string" && typeof rule.values[0] === "string"
        ? attrValue.startsWith(rule.values[0] as string)
        : false;

    case "endsWith":
      return typeof attrValue === "string" && typeof rule.values[0] === "string"
        ? attrValue.endsWith(rule.values[0] as string)
        : false;

    default:
      return false;
  }
}

/** Returns the first targeting rule whose conditions all match the context, or undefined */
export function matchTargetingRule(
  rules: readonly FlagTargetingRule[],
  ctx: EvaluationContext
): FlagTargetingRule | undefined {
  for (const rule of rules) {
    const allMatch = rule.conditions.every((condition) =>
      evaluateCondition(condition, ctx)
    );
    if (allMatch) {
      return rule;
    }
  }
  return undefined;
}
