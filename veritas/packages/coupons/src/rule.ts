// Redemption rules that constrain when a coupon may be used.
import { z } from "zod";

export const PlanRestrictionsSchema = z.object({
  allowedPlanIds: z.array(z.string()).min(1).optional(),
  allowedTiers: z.array(z.string()).min(1).optional(),
});
export type PlanRestrictions = z.infer<typeof PlanRestrictionsSchema>;

export const UserRestrictionsSchema = z.object({
  firstOrderOnly: z.boolean().optional(),
  allowedUserIds: z.array(z.string()).min(1).optional(),
  allowedOrgIds: z.array(z.string()).min(1).optional(),
});
export type UserRestrictions = z.infer<typeof UserRestrictionsSchema>;

export const UsageLimitsSchema = z.object({
  maxTotalRedemptions: z.number().int().positive().optional(),
  maxPerUser: z.number().int().positive().optional(),
});
export type UsageLimits = z.infer<typeof UsageLimitsSchema>;

export const ValidityWindowSchema = z.object({
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type ValidityWindow = z.infer<typeof ValidityWindowSchema>;

export const RedemptionRuleSchema = z.object({
  plan: PlanRestrictionsSchema.optional(),
  user: UserRestrictionsSchema.optional(),
  usage: UsageLimitsSchema.optional(),
  validity: ValidityWindowSchema.optional(),
  minOrderBaseUnits: z.bigint().nonnegative().optional(),
  stackable: z.boolean().default(false),
});
export type RedemptionRule = z.infer<typeof RedemptionRuleSchema>;

export interface RuleContext {
  readonly nowIso: string;
  readonly userId: string;
  readonly orgId?: string;
  readonly planId?: string;
  readonly tier?: string;
  readonly isFirstOrder: boolean;
  readonly orderBaseUnits: bigint;
  readonly totalRedemptionCount: number;
  readonly userRedemptionCount: number;
}

export type RuleViolation =
  | "expired"
  | "not_yet_active"
  | "plan_not_allowed"
  | "tier_not_allowed"
  | "first_order_only"
  | "user_not_allowed"
  | "org_not_allowed"
  | "total_limit_reached"
  | "per_user_limit_reached"
  | "min_order_not_met";

/** Return all rule violations for a context, or empty array if all pass. */
export function evaluateRules(rule: RedemptionRule, ctx: RuleContext): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (rule.validity?.expiresAt && ctx.nowIso > rule.validity.expiresAt) {
    violations.push("expired");
  }
  if (rule.validity?.startsAt && ctx.nowIso < rule.validity.startsAt) {
    violations.push("not_yet_active");
  }
  if (rule.plan?.allowedPlanIds && ctx.planId && !rule.plan.allowedPlanIds.includes(ctx.planId)) {
    violations.push("plan_not_allowed");
  }
  if (rule.plan?.allowedTiers && ctx.tier && !rule.plan.allowedTiers.includes(ctx.tier)) {
    violations.push("tier_not_allowed");
  }
  if (rule.user?.firstOrderOnly && !ctx.isFirstOrder) {
    violations.push("first_order_only");
  }
  if (rule.user?.allowedUserIds && !rule.user.allowedUserIds.includes(ctx.userId)) {
    violations.push("user_not_allowed");
  }
  if (rule.user?.allowedOrgIds && ctx.orgId && !rule.user.allowedOrgIds.includes(ctx.orgId)) {
    violations.push("org_not_allowed");
  }
  if (rule.usage?.maxTotalRedemptions !== undefined && ctx.totalRedemptionCount >= rule.usage.maxTotalRedemptions) {
    violations.push("total_limit_reached");
  }
  if (rule.usage?.maxPerUser !== undefined && ctx.userRedemptionCount >= rule.usage.maxPerUser) {
    violations.push("per_user_limit_reached");
  }
  if (rule.minOrderBaseUnits !== undefined && ctx.orderBaseUnits < rule.minOrderBaseUnits) {
    violations.push("min_order_not_met");
  }

  return violations;
}
