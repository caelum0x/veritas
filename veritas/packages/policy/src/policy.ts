// Policy: an ordered collection of rules with a combination strategy
import type { Rule } from './rule.js';
import { sortByPriority } from './rule.js';

export type CombinationStrategy = 'first_match' | 'all_match' | 'any_deny';

export interface Policy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly strategy: CombinationStrategy;
  readonly rules: ReadonlyArray<Rule>;
  readonly enabled: boolean;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePolicy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version?: string;
  readonly strategy?: CombinationStrategy;
  readonly rules: ReadonlyArray<Rule>;
  readonly enabled?: boolean;
  readonly tags?: ReadonlyArray<string>;
}

export function makePolicy(input: CreatePolicy, now: string): Policy {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    version: input.version ?? '1.0.0',
    strategy: input.strategy ?? 'first_match',
    rules: sortByPriority(input.rules),
    enabled: input.enabled ?? true,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addRule(policy: Policy, rule: Rule, now: string): Policy {
  return {
    ...policy,
    rules: sortByPriority([...policy.rules, rule]),
    updatedAt: now,
  };
}

export function removeRule(policy: Policy, ruleId: string, now: string): Policy {
  return {
    ...policy,
    rules: policy.rules.filter((r) => r.id !== ruleId),
    updatedAt: now,
  };
}

export function withEnabled(policy: Policy, enabled: boolean, now: string): Policy {
  return { ...policy, enabled, updatedAt: now };
}

export function enabledRules(policy: Policy): ReadonlyArray<Rule> {
  return policy.rules.filter((r) => r.enabled);
}
