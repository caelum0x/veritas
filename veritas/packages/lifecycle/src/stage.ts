// Lifecycle stage definitions for customer and entity state management.
import { z } from "zod";

export const LifecycleStageSchema = z.enum([
  "prospect",
  "trial",
  "active",
  "past_due",
  "suspended",
  "churned",
  "reactivated",
  "enterprise_onboarding",
  "enterprise_active",
  "enterprise_offboarding",
]);

export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;

export interface StageConfig {
  readonly stage: LifecycleStage;
  readonly label: string;
  readonly description: string;
  readonly isFinal: boolean;
  readonly allowsBilling: boolean;
  readonly allowsApiAccess: boolean;
  readonly maxDurationDays: number | null;
}

const STAGE_CONFIGS: Readonly<Record<LifecycleStage, StageConfig>> = {
  prospect: {
    stage: "prospect",
    label: "Prospect",
    description: "User has expressed interest but not yet started a trial.",
    isFinal: false,
    allowsBilling: false,
    allowsApiAccess: false,
    maxDurationDays: 90,
  },
  trial: {
    stage: "trial",
    label: "Trial",
    description: "User is in a free trial period with limited access.",
    isFinal: false,
    allowsBilling: false,
    allowsApiAccess: true,
    maxDurationDays: 30,
  },
  active: {
    stage: "active",
    label: "Active",
    description: "User has an active paid subscription.",
    isFinal: false,
    allowsBilling: true,
    allowsApiAccess: true,
    maxDurationDays: null,
  },
  past_due: {
    stage: "past_due",
    label: "Past Due",
    description: "Payment failed; account is in grace period.",
    isFinal: false,
    allowsBilling: true,
    allowsApiAccess: true,
    maxDurationDays: 14,
  },
  suspended: {
    stage: "suspended",
    label: "Suspended",
    description: "Account suspended due to non-payment or policy violation.",
    isFinal: false,
    allowsBilling: false,
    allowsApiAccess: false,
    maxDurationDays: 60,
  },
  churned: {
    stage: "churned",
    label: "Churned",
    description: "User has cancelled and subscription has ended.",
    isFinal: true,
    allowsBilling: false,
    allowsApiAccess: false,
    maxDurationDays: null,
  },
  reactivated: {
    stage: "reactivated",
    label: "Reactivated",
    description: "Previously churned user has re-subscribed.",
    isFinal: false,
    allowsBilling: true,
    allowsApiAccess: true,
    maxDurationDays: null,
  },
  enterprise_onboarding: {
    stage: "enterprise_onboarding",
    label: "Enterprise Onboarding",
    description: "Enterprise account is being provisioned and configured.",
    isFinal: false,
    allowsBilling: false,
    allowsApiAccess: false,
    maxDurationDays: 30,
  },
  enterprise_active: {
    stage: "enterprise_active",
    label: "Enterprise Active",
    description: "Enterprise account is fully operational.",
    isFinal: false,
    allowsBilling: true,
    allowsApiAccess: true,
    maxDurationDays: null,
  },
  enterprise_offboarding: {
    stage: "enterprise_offboarding",
    label: "Enterprise Offboarding",
    description: "Enterprise account is being wound down.",
    isFinal: false,
    allowsBilling: false,
    allowsApiAccess: false,
    maxDurationDays: 30,
  },
};

export function getStageConfig(stage: LifecycleStage): StageConfig {
  return STAGE_CONFIGS[stage];
}

export function getAllStages(): ReadonlyArray<StageConfig> {
  return Object.values(STAGE_CONFIGS);
}

export function isFinalStage(stage: LifecycleStage): boolean {
  return STAGE_CONFIGS[stage].isFinal;
}

export function stageAllowsApiAccess(stage: LifecycleStage): boolean {
  return STAGE_CONFIGS[stage].allowsApiAccess;
}

export function stageAllowsBilling(stage: LifecycleStage): boolean {
  return STAGE_CONFIGS[stage].allowsBilling;
}
