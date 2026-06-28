// Decision result: outcome of evaluating a policy or rule against a context.

export type DecisionOutcome = 'allow' | 'deny' | 'not-applicable' | 'indeterminate';

export interface RuleDecision {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly outcome: DecisionOutcome;
  readonly actionsTriggered: ReadonlyArray<string>;
  readonly reason?: string;
}

export interface Decision {
  readonly policyId: string;
  readonly outcome: DecisionOutcome;
  readonly ruleDecisions: ReadonlyArray<RuleDecision>;
  readonly reason?: string;
  readonly evaluatedAt: string;
}

export function makeDecision(
  policyId: string,
  outcome: DecisionOutcome,
  ruleDecisions: ReadonlyArray<RuleDecision>,
  reason?: string,
): Decision {
  return {
    policyId,
    outcome,
    ruleDecisions,
    reason,
    evaluatedAt: new Date().toISOString(),
  };
}

export function isAllowed(decision: Decision): boolean {
  return decision.outcome === 'allow';
}

export function isDenied(decision: Decision): boolean {
  return decision.outcome === 'deny';
}

export function isNotApplicable(decision: Decision): boolean {
  return decision.outcome === 'not-applicable';
}

export function triggeredRules(decision: Decision): ReadonlyArray<RuleDecision> {
  return decision.ruleDecisions.filter(
    (rd) => rd.outcome === 'allow' || rd.outcome === 'deny',
  );
}

export function makeRuleDecision(
  ruleId: string,
  ruleName: string,
  outcome: DecisionOutcome,
  actionsTriggered: ReadonlyArray<string> = [],
  reason?: string,
): RuleDecision {
  return { ruleId, ruleName, outcome, actionsTriggered, reason };
}
