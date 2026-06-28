// WAF rule definition: conditions, actions, and metadata for request filtering
import { z } from "zod";

export const RuleActionSchema = z.enum(["allow", "block", "challenge", "log"]);
export type RuleAction = z.infer<typeof RuleActionSchema>;

export const RuleConditionSchema = z.object({
  field: z.enum(["ip", "uri", "method", "header", "body", "query", "geo"]),
  operator: z.enum(["eq", "contains", "startsWith", "endsWith", "matches", "in", "notIn"]),
  value: z.union([z.string(), z.array(z.string())]),
  headerName: z.string().optional(),
});
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const RuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  priority: z.number().int().min(0).max(10000),
  enabled: z.boolean().default(true),
  action: RuleActionSchema,
  conditions: z.array(RuleConditionSchema).min(1),
  conditionLogic: z.enum(["AND", "OR"]).default("AND"),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const CreateRuleSchema = RuleSchema.omit({ createdAt: true, updatedAt: true });
export type CreateRule = z.infer<typeof CreateRuleSchema>;

export function makeRule(input: CreateRule): Rule {
  const now = new Date().toISOString();
  return RuleSchema.parse({ ...input, createdAt: now, updatedAt: now });
}

export function matchesCondition(
  condition: RuleCondition,
  request: Readonly<Record<string, unknown>>,
): boolean {
  const { field, operator, value, headerName } = condition;

  let fieldValue: string | undefined;

  if (field === "header" && headerName) {
    const headers = request["headers"];
    if (isRecord(headers)) {
      fieldValue = String(headers[headerName.toLowerCase()] ?? "");
    }
  } else {
    const raw = request[field];
    fieldValue = raw !== undefined && raw !== null ? String(raw) : undefined;
  }

  if (fieldValue === undefined) return false;

  switch (operator) {
    case "eq":
      return fieldValue === String(value);
    case "contains":
      return fieldValue.includes(String(value));
    case "startsWith":
      return fieldValue.startsWith(String(value));
    case "endsWith":
      return fieldValue.endsWith(String(value));
    case "matches":
      return new RegExp(String(value)).test(fieldValue);
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    case "notIn":
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function evaluateRule(
  rule: Rule,
  request: Readonly<Record<string, unknown>>,
): boolean {
  if (!rule.enabled) return false;
  const results = rule.conditions.map((c) => matchesCondition(c, request));
  return rule.conditionLogic === "AND"
    ? results.every(Boolean)
    : results.some(Boolean);
}
