// Transition rules — guard conditions that must pass before a stage change is allowed.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type LifecycleStage, LifecycleStageSchema } from "./stage.js";
import { type TriggerType } from "./trigger.js";

export interface RuleContext {
  readonly entityId: string;
  readonly entityType: string;
  readonly fromStage: LifecycleStage;
  readonly toStage: LifecycleStage;
  readonly trigger: TriggerType;
  readonly actorId: string | null;
  readonly metadata: Record<string, unknown>;
}

export const RuleContextSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.string().min(1),
  fromStage: LifecycleStageSchema,
  toStage: LifecycleStageSchema,
  trigger: z.string().min(1),
  actorId: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export type RuleResult = Result<true, string>;

export interface TransitionRule {
  readonly id: string;
  readonly description: string;
  evaluate(ctx: RuleContext): RuleResult;
}

export interface RuleSet {
  readonly rules: ReadonlyArray<TransitionRule>;
  evaluateAll(ctx: RuleContext): RuleResult;
}

function makeRuleSet(rules: ReadonlyArray<TransitionRule>): RuleSet {
  return {
    rules,
    evaluateAll(ctx: RuleContext): RuleResult {
      for (const rule of rules) {
        const result = rule.evaluate(ctx);
        if (result.ok === false) {
          return result;
        }
      }
      return ok(true);
    },
  };
}

const noFinalStateExitRule: TransitionRule = {
  id: "no_final_state_exit",
  description: "Entities in a final stage cannot transition except to reactivated.",
  evaluate(ctx: RuleContext): RuleResult {
    if (ctx.fromStage === "churned" && ctx.toStage !== "reactivated") {
      return err(`Cannot transition from final stage 'churned' to '${ctx.toStage}'.`);
    }
    return ok(true);
  },
};

const manualOverrideRequiresActorRule: TransitionRule = {
  id: "manual_override_requires_actor",
  description: "Manual overrides must have a non-null actorId.",
  evaluate(ctx: RuleContext): RuleResult {
    if (ctx.trigger === "manual_override" && ctx.actorId === null) {
      return err("Manual override transitions require an actorId.");
    }
    return ok(true);
  },
};

const enterpriseRequiresApprovalRule: TransitionRule = {
  id: "enterprise_transitions_require_actor",
  description: "Enterprise stage transitions require an actorId.",
  evaluate(ctx: RuleContext): RuleResult {
    const enterpriseStages: ReadonlyArray<LifecycleStage> = [
      "enterprise_onboarding",
      "enterprise_active",
      "enterprise_offboarding",
    ];
    const isEnterpriseBound =
      enterpriseStages.includes(ctx.toStage) ||
      enterpriseStages.includes(ctx.fromStage);
    if (isEnterpriseBound && ctx.actorId === null && ctx.trigger !== "enterprise_offboarding_complete") {
      return err("Enterprise lifecycle transitions require an actorId.");
    }
    return ok(true);
  },
};

const noSelfTransitionRule: TransitionRule = {
  id: "no_self_transition",
  description: "A stage cannot transition to itself.",
  evaluate(ctx: RuleContext): RuleResult {
    if (ctx.fromStage === ctx.toStage) {
      return err(`Self-transition on stage '${ctx.fromStage}' is not allowed.`);
    }
    return ok(true);
  },
};

const suspendedReactivationRule: TransitionRule = {
  id: "suspended_reactivation_requires_payment",
  description: "Suspended accounts need payment_succeeded or manual_override to reactivate.",
  evaluate(ctx: RuleContext): RuleResult {
    if (
      ctx.fromStage === "suspended" &&
      ctx.toStage === "active" &&
      ctx.trigger !== "payment_succeeded" &&
      ctx.trigger !== "account_reactivated" &&
      ctx.trigger !== "manual_override"
    ) {
      return err("Suspended accounts can only be reactivated via payment or manual override.");
    }
    return ok(true);
  },
};

export const DEFAULT_RULE_SET: RuleSet = makeRuleSet([
  noSelfTransitionRule,
  noFinalStateExitRule,
  manualOverrideRequiresActorRule,
  enterpriseRequiresApprovalRule,
  suspendedReactivationRule,
]);

export function evaluateRules(ctx: RuleContext, ruleSet: RuleSet = DEFAULT_RULE_SET): RuleResult {
  return ruleSet.evaluateAll(ctx);
}

export function createCustomRuleSet(additionalRules: ReadonlyArray<TransitionRule>): RuleSet {
  return makeRuleSet([
    noSelfTransitionRule,
    noFinalStateExitRule,
    manualOverrideRequiresActorRule,
    enterpriseRequiresApprovalRule,
    suspendedReactivationRule,
    ...additionalRules,
  ]);
}
