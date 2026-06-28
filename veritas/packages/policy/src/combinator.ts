// Combinator: merge multiple Decisions into a single Decision using combining algorithms.
import type { Decision, DecisionOutcome, RuleDecision } from './decision.js';
import { makeDecision } from './decision.js';

export type CombiningAlgorithm =
  | 'deny-overrides'
  | 'permit-overrides'
  | 'first-applicable'
  | 'only-one-applicable'
  | 'unanimous';

export interface CombineOptions {
  readonly policyId: string;
  readonly algorithm: CombiningAlgorithm;
  readonly decisions: ReadonlyArray<Decision>;
}

function mergeRuleDecisions(decisions: ReadonlyArray<Decision>): ReadonlyArray<RuleDecision> {
  return decisions.flatMap((d) => d.ruleDecisions);
}

function combineOutcomes(
  algorithm: CombiningAlgorithm,
  decisions: ReadonlyArray<Decision>,
): { outcome: DecisionOutcome; reason?: string } {
  const outcomes = decisions.map((d) => d.outcome);

  if (decisions.length === 0) {
    return { outcome: 'not-applicable', reason: 'No decisions to combine' };
  }

  switch (algorithm) {
    case 'deny-overrides': {
      if (outcomes.includes('deny')) return { outcome: 'deny', reason: 'At least one decision denied' };
      if (outcomes.includes('indeterminate')) return { outcome: 'indeterminate', reason: 'Indeterminate decision present' };
      if (outcomes.includes('allow')) return { outcome: 'allow' };
      return { outcome: 'not-applicable' };
    }

    case 'permit-overrides': {
      if (outcomes.includes('allow')) return { outcome: 'allow', reason: 'At least one decision allowed' };
      if (outcomes.includes('indeterminate')) return { outcome: 'indeterminate', reason: 'Indeterminate decision present' };
      if (outcomes.includes('deny')) return { outcome: 'deny' };
      return { outcome: 'not-applicable' };
    }

    case 'first-applicable': {
      const first = decisions.find(
        (d) => d.outcome === 'allow' || d.outcome === 'deny',
      );
      if (first === undefined) return { outcome: 'not-applicable', reason: 'No applicable decision found' };
      return { outcome: first.outcome, reason: first.reason };
    }

    case 'only-one-applicable': {
      const applicable = decisions.filter(
        (d) => d.outcome === 'allow' || d.outcome === 'deny',
      );
      if (applicable.length === 0) return { outcome: 'not-applicable' };
      if (applicable.length > 1) {
        return { outcome: 'indeterminate', reason: 'Multiple applicable decisions found' };
      }
      const single = applicable[0] as Decision;
      return { outcome: single.outcome, reason: single.reason };
    }

    case 'unanimous': {
      const applicable = decisions.filter(
        (d) => d.outcome === 'allow' || d.outcome === 'deny',
      );
      if (applicable.length === 0) return { outcome: 'not-applicable' };
      const allAllow = applicable.every((d) => d.outcome === 'allow');
      if (allAllow) return { outcome: 'allow', reason: 'All decisions allowed' };
      return { outcome: 'deny', reason: 'Not all decisions allowed (unanimous required)' };
    }

    default:
      return { outcome: 'indeterminate', reason: `Unknown algorithm: ${algorithm}` };
  }
}

export function combine(options: CombineOptions): Decision {
  const { policyId, algorithm, decisions } = options;
  const { outcome, reason } = combineOutcomes(algorithm, decisions);
  const ruleDecisions = mergeRuleDecisions(decisions);
  return makeDecision(policyId, outcome, ruleDecisions, reason);
}

export function combineAll(
  policyId: string,
  algorithm: CombiningAlgorithm,
  decisions: ReadonlyArray<Decision>,
): Decision {
  return combine({ policyId, algorithm, decisions });
}
