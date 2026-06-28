// Lifecycle triggers — events that cause automatic stage transitions.
import { z } from "zod";
import { type LifecycleStage, LifecycleStageSchema } from "./stage.js";

export const TriggerTypeSchema = z.enum([
  "payment_failed",
  "payment_succeeded",
  "subscription_cancelled",
  "subscription_created",
  "trial_started",
  "trial_expired",
  "trial_converted",
  "grace_period_expired",
  "account_suspended",
  "account_reactivated",
  "enterprise_contract_signed",
  "enterprise_onboarding_complete",
  "enterprise_cancellation_requested",
  "enterprise_offboarding_complete",
  "win_back_accepted",
  "manual_override",
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const TriggerSchema = z.object({
  type: TriggerTypeSchema,
  targetStage: LifecycleStageSchema,
  description: z.string(),
  isAutomatic: z.boolean(),
});

export type Trigger = z.infer<typeof TriggerSchema>;

export interface TriggerContext {
  readonly entityId: string;
  readonly currentStage: LifecycleStage;
  readonly metadata: Record<string, unknown>;
  readonly triggeredAt: string;
}

export const TriggerContextSchema = z.object({
  entityId: z.string().min(1),
  currentStage: LifecycleStageSchema,
  metadata: z.record(z.unknown()),
  triggeredAt: z.string().datetime(),
});

const TRIGGERS: Readonly<Record<TriggerType, Trigger>> = {
  payment_failed: {
    type: "payment_failed",
    targetStage: "past_due",
    description: "Payment attempt failed; move to past_due grace period.",
    isAutomatic: true,
  },
  payment_succeeded: {
    type: "payment_succeeded",
    targetStage: "active",
    description: "Payment recovered; restore active status.",
    isAutomatic: true,
  },
  subscription_cancelled: {
    type: "subscription_cancelled",
    targetStage: "churned",
    description: "Subscription explicitly cancelled by user.",
    isAutomatic: false,
  },
  subscription_created: {
    type: "subscription_created",
    targetStage: "active",
    description: "New paid subscription created.",
    isAutomatic: true,
  },
  trial_started: {
    type: "trial_started",
    targetStage: "trial",
    description: "Free trial period has begun.",
    isAutomatic: true,
  },
  trial_expired: {
    type: "trial_expired",
    targetStage: "churned",
    description: "Trial ended without conversion.",
    isAutomatic: true,
  },
  trial_converted: {
    type: "trial_converted",
    targetStage: "active",
    description: "Trial user upgraded to paid plan.",
    isAutomatic: true,
  },
  grace_period_expired: {
    type: "grace_period_expired",
    targetStage: "suspended",
    description: "Past-due grace period elapsed without payment.",
    isAutomatic: true,
  },
  account_suspended: {
    type: "account_suspended",
    targetStage: "suspended",
    description: "Account manually suspended.",
    isAutomatic: false,
  },
  account_reactivated: {
    type: "account_reactivated",
    targetStage: "active",
    description: "Suspended account reactivated after issue resolved.",
    isAutomatic: false,
  },
  enterprise_contract_signed: {
    type: "enterprise_contract_signed",
    targetStage: "enterprise_onboarding",
    description: "Enterprise contract executed; begin onboarding.",
    isAutomatic: false,
  },
  enterprise_onboarding_complete: {
    type: "enterprise_onboarding_complete",
    targetStage: "enterprise_active",
    description: "Enterprise setup finalized.",
    isAutomatic: false,
  },
  enterprise_cancellation_requested: {
    type: "enterprise_cancellation_requested",
    targetStage: "enterprise_offboarding",
    description: "Enterprise customer requested cancellation.",
    isAutomatic: false,
  },
  enterprise_offboarding_complete: {
    type: "enterprise_offboarding_complete",
    targetStage: "churned",
    description: "Enterprise data export and wind-down complete.",
    isAutomatic: false,
  },
  win_back_accepted: {
    type: "win_back_accepted",
    targetStage: "reactivated",
    description: "Churned user accepted a win-back offer.",
    isAutomatic: false,
  },
  manual_override: {
    type: "manual_override",
    targetStage: "active",
    description: "Admin manually overrode lifecycle stage.",
    isAutomatic: false,
  },
};

export function getTrigger(type: TriggerType): Trigger {
  return TRIGGERS[type];
}

export function getAutomaticTriggers(): ReadonlyArray<Trigger> {
  return Object.values(TRIGGERS).filter((t) => t.isAutomatic);
}

export function getManualTriggers(): ReadonlyArray<Trigger> {
  return Object.values(TRIGGERS).filter((t) => !t.isAutomatic);
}

export function resolveTriggerTarget(
  type: TriggerType,
  overrideStage?: LifecycleStage
): LifecycleStage {
  if (type === "manual_override" && overrideStage !== undefined) {
    return overrideStage;
  }
  return TRIGGERS[type].targetStage;
}
