// Policy rule: named condition+action pair with priority and metadata
import type { Condition } from './condition.js';
import type { Action } from './action.js';

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priority: number;
  readonly condition: Condition;
  readonly actions: ReadonlyArray<Action>;
  readonly enabled: boolean;
  readonly tags: ReadonlyArray<string>;
}

export interface CreateRule {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priority?: number;
  readonly condition: Condition;
  readonly actions: ReadonlyArray<Action>;
  readonly enabled?: boolean;
  readonly tags?: ReadonlyArray<string>;
}

export function makeRule(input: CreateRule): Rule {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    priority: input.priority ?? 0,
    condition: input.condition,
    actions: input.actions,
    enabled: input.enabled ?? true,
    tags: input.tags ?? [],
  };
}

export function withPriority(rule: Rule, priority: number): Rule {
  return { ...rule, priority };
}

export function withEnabled(rule: Rule, enabled: boolean): Rule {
  return { ...rule, enabled };
}

export function sortByPriority(rules: ReadonlyArray<Rule>): ReadonlyArray<Rule> {
  return [...rules].sort((a, b) => b.priority - a.priority);
}
