// Audience targeting engine — evaluates rules against user attributes
import { Result, ok, err } from "@veritas/core";
import {
  Targeting,
  TargetingRule,
  TargetingCondition,
  TargetingOperator,
  UserAttributes,
} from "./types.js";
import { TargetingError } from "./errors.js";

function evaluateCondition(
  condition: TargetingCondition,
  attributes: UserAttributes
): boolean {
  const raw = attributes[condition.attribute];
  if (raw === undefined || raw === null) return false;

  const attrValue = raw as string | number | boolean | readonly string[] | readonly number[];
  const condValue = condition.value;
  const op: TargetingOperator = condition.operator;

  switch (op) {
    case "eq":
      return attrValue === condValue;
    case "neq":
      return attrValue !== condValue;
    case "gt":
      return typeof attrValue === "number" && typeof condValue === "number" && attrValue > condValue;
    case "gte":
      return typeof attrValue === "number" && typeof condValue === "number" && attrValue >= condValue;
    case "lt":
      return typeof attrValue === "number" && typeof condValue === "number" && attrValue < condValue;
    case "lte":
      return typeof attrValue === "number" && typeof condValue === "number" && attrValue <= condValue;
    case "in": {
      const list = Array.isArray(condValue) ? condValue : [condValue];
      return list.includes(attrValue as string | number);
    }
    case "nin": {
      const list = Array.isArray(condValue) ? condValue : [condValue];
      return !list.includes(attrValue as string | number);
    }
    case "contains":
      if (typeof attrValue === "string" && typeof condValue === "string") {
        return attrValue.includes(condValue);
      }
      if (Array.isArray(attrValue)) {
        return (attrValue as readonly (string | number)[]).includes(condValue as string | number);
      }
      return false;
    case "not_contains":
      if (typeof attrValue === "string" && typeof condValue === "string") {
        return !attrValue.includes(condValue);
      }
      if (Array.isArray(attrValue)) {
        return !(attrValue as readonly (string | number)[]).includes(condValue as string | number);
      }
      return false;
    default:
      return false;
  }
}

function evaluateRule(rule: TargetingRule, attributes: UserAttributes): boolean {
  if (rule.combinator === "or") {
    return rule.conditions.some((c) => evaluateCondition(c, attributes));
  }
  return rule.conditions.every((c) => evaluateCondition(c, attributes));
}

export function evaluateTargeting(
  targeting: Targeting,
  attributes: UserAttributes,
  bucketValue: number
): Result<boolean, TargetingError> {
  if (bucketValue < 0 || bucketValue > 1) {
    return err(new TargetingError(`bucketValue must be in [0,1], got ${bucketValue}`));
  }

  if (bucketValue >= targeting.sampleRate) {
    return ok(false);
  }

  if (targeting.rules.length === 0) {
    return ok(true);
  }

  const matched = targeting.rules.every((rule) => evaluateRule(rule, attributes));
  return ok(matched);
}

export function buildTargeting(
  rules: Targeting["rules"],
  sampleRate = 1
): Result<Targeting, TargetingError> {
  if (sampleRate < 0 || sampleRate > 1) {
    return err(new TargetingError(`sampleRate must be in [0,1], got ${sampleRate}`));
  }
  return ok({ rules, sampleRate });
}
