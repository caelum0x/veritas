// Policy evaluator: applies rules to an EvalContext and produces a Decision
import { evaluateCondition } from './condition.js';
import type { Action } from './action.js';
import { isDenyAction } from './action.js';
import type { Policy } from './policy.js';
import { enabledRules } from './policy.js';
import type { EvalContext } from './context.js';
import type { Decision, DecisionOutcome, RuleDecision } from './decision.js';
import { makeDecision, makeRuleDecision } from './decision.js';
import type { Rule } from './rule.js';

export interface EvaluatorOptions {
  readonly stopOnFirstDeny?: boolean;
}

function applyRule(rule: Rule, ctx: EvalContext): ReadonlyArray<Action> {
  if (!evaluateCondition(rule.condition, ctx)) return [];
  return rule.actions;
}

function outcomeFromActions(actions: ReadonlyArray<Action>): DecisionOutcome {
  if (actions.some(isDenyAction)) return 'deny';
  if (actions.some((a) => a.kind === 'allow')) return 'allow';
  return 'not-applicable';
}

function reasonFromActions(actions: ReadonlyArray<Action>): string | undefined {
  const denyAction = actions.find(isDenyAction);
  if (denyAction != null) return denyAction.reason;
  return undefined;
}

function toRuleDecision(rule: Rule, actions: ReadonlyArray<Action>): RuleDecision {
  const triggered = actions.map((a) => a.kind);
  const outcome = outcomeFromActions(actions);
  return makeRuleDecision(rule.id, rule.name, outcome, triggered, reasonFromActions(actions));
}

export function evaluate(
  policy: Policy,
  ctx: EvalContext,
  options: EvaluatorOptions = {},
): Decision {
  if (!policy.enabled) {
    return makeDecision(policy.id, 'not-applicable', []);
  }

  const rules = enabledRules(policy);
  const ruleDecisions: Array<RuleDecision> = [];

  if (policy.strategy === 'first_match') {
    for (const rule of rules) {
      const actions = applyRule(rule, ctx);
      if (actions.length > 0) {
        ruleDecisions.push(toRuleDecision(rule, actions));
        break;
      }
    }
  } else if (policy.strategy === 'all_match') {
    for (const rule of rules) {
      const actions = applyRule(rule, ctx);
      if (actions.length > 0) {
        ruleDecisions.push(toRuleDecision(rule, actions));
      }
    }
  } else if (policy.strategy === 'any_deny') {
    for (const rule of rules) {
      const actions = applyRule(rule, ctx);
      if (actions.length > 0) {
        ruleDecisions.push(toRuleDecision(rule, actions));
        const hasDeny = actions.some(isDenyAction);
        if (hasDeny && (options.stopOnFirstDeny ?? true)) break;
      }
    }
  }

  const hasDeny = ruleDecisions.some((rd) => rd.outcome === 'deny');
  const hasAllow = ruleDecisions.some((rd) => rd.outcome === 'allow');

  let outcome: DecisionOutcome;
  if (hasDeny) {
    outcome = 'deny';
  } else if (hasAllow) {
    outcome = 'allow';
  } else if (ruleDecisions.length > 0) {
    outcome = 'allow';
  } else {
    outcome = 'allow'; // default-allow when no rules match
  }

  const denyDecision = ruleDecisions.find((rd) => rd.outcome === 'deny');
  return makeDecision(policy.id, outcome, ruleDecisions, denyDecision?.reason);
}

export function evaluateAll(
  policies: ReadonlyArray<Policy>,
  ctx: EvalContext,
  options: EvaluatorOptions = {},
): ReadonlyArray<Decision> {
  return policies.map((p) => evaluate(p, ctx, options));
}

export function combineDecisions(decisions: ReadonlyArray<Decision>): Decision {
  if (decisions.length === 0) {
    return makeDecision('combined', 'allow', []);
  }

  const hasDeny = decisions.some((d) => d.outcome === 'deny');
  const hasAllow = decisions.some((d) => d.outcome === 'allow');
  const allRuleDecisions = decisions.flatMap((d) => [...d.ruleDecisions]);

  let outcome: DecisionOutcome;
  if (hasDeny) {
    outcome = 'deny';
  } else if (hasAllow) {
    outcome = 'allow';
  } else {
    outcome = 'not-applicable';
  }

  const denyDecision = decisions.find((d) => d.outcome === 'deny');
  return makeDecision('combined', outcome, allRuleDecisions, denyDecision?.reason);
}
