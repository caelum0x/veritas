// Segment rule — a single predicate evaluated against user traits.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { TraitValue } from "./types.js";
import { InvalidRuleError } from "./errors.js";

export type RuleOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists";

export const RuleSchema = z.object({
  trait: z.string().min(1),
  operator: z.enum([
    "eq", "neq", "gt", "gte", "lt", "lte",
    "contains", "not_contains", "exists", "not_exists",
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export type Rule = z.infer<typeof RuleSchema>;

export type RuleGroup = {
  readonly conjunction: "and" | "or";
  readonly rules: ReadonlyArray<Rule>;
};

export const RuleGroupSchema = z.object({
  conjunction: z.enum(["and", "or"]),
  rules: z.array(RuleSchema).min(1),
});

/** Parse a raw rule group, returning a typed Result. */
export function parseRuleGroup(raw: unknown): Result<RuleGroup, InvalidRuleError> {
  const parsed = RuleGroupSchema.safeParse(raw);
  if (!parsed.success) {
    return err(new InvalidRuleError(parsed.error.issues[0]?.message ?? "invalid rule group"));
  }
  return ok(parsed.data as RuleGroup);
}

/** Evaluate a single rule against a trait value. */
export function evaluateRule(rule: Rule, traitVal: TraitValue | undefined): boolean {
  const { operator, value } = rule;
  if (operator === "exists") return traitVal !== undefined && traitVal !== null;
  if (operator === "not_exists") return traitVal === undefined || traitVal === null;
  if (traitVal === undefined || traitVal === null) return false;

  switch (operator) {
    case "eq": return traitVal === value;
    case "neq": return traitVal !== value;
    case "gt": return typeof traitVal === "number" && typeof value === "number" && traitVal > value;
    case "gte": return typeof traitVal === "number" && typeof value === "number" && traitVal >= value;
    case "lt": return typeof traitVal === "number" && typeof value === "number" && traitVal < value;
    case "lte": return typeof traitVal === "number" && typeof value === "number" && traitVal <= value;
    case "contains":
      return typeof traitVal === "string" && typeof value === "string" && traitVal.includes(value);
    case "not_contains":
      return typeof traitVal === "string" && typeof value === "string" && !traitVal.includes(value);
    default:
      return false;
  }
}
