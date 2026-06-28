// Managed ruleset: ordered collection of WAF rules with lifecycle management
import { z } from "zod";
import { type Rule, RuleSchema, makeRule, type CreateRule } from "./rule.js";

export const RulesetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  enabled: z.boolean().default(true),
  rules: z.array(RuleSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Ruleset = z.infer<typeof RulesetSchema>;

export const CreateRulesetSchema = RulesetSchema.omit({
  createdAt: true,
  updatedAt: true,
  rules: true,
});
export type CreateRuleset = z.infer<typeof CreateRulesetSchema>;

export function makeRuleset(input: CreateRuleset): Ruleset {
  const now = new Date().toISOString();
  return RulesetSchema.parse({ ...input, rules: [], createdAt: now, updatedAt: now });
}

export function addRule(ruleset: Ruleset, ruleInput: CreateRule): Ruleset {
  const newRule = makeRule(ruleInput);
  const rules = [...ruleset.rules, newRule].sort((a, b) => a.priority - b.priority);
  return { ...ruleset, rules, updatedAt: new Date().toISOString() };
}

export function removeRule(ruleset: Ruleset, ruleId: string): Ruleset {
  const rules = ruleset.rules.filter((r) => r.id !== ruleId);
  return { ...ruleset, rules, updatedAt: new Date().toISOString() };
}

export function updateRule(ruleset: Ruleset, ruleId: string, patch: Partial<Rule>): Ruleset {
  const rules = ruleset.rules
    .map((r) => (r.id === ruleId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))
    .sort((a, b) => a.priority - b.priority);
  return { ...ruleset, rules, updatedAt: new Date().toISOString() };
}

export function enableRule(ruleset: Ruleset, ruleId: string): Ruleset {
  return updateRule(ruleset, ruleId, { enabled: true });
}

export function disableRule(ruleset: Ruleset, ruleId: string): Ruleset {
  return updateRule(ruleset, ruleId, { enabled: false });
}

export function getEnabledRules(ruleset: Ruleset): readonly Rule[] {
  return ruleset.enabled ? ruleset.rules.filter((r) => r.enabled) : [];
}

export function mergeRulesets(...rulesets: Ruleset[]): readonly Rule[] {
  return rulesets
    .flatMap((rs) => getEnabledRules(rs))
    .sort((a, b) => a.priority - b.priority);
}
