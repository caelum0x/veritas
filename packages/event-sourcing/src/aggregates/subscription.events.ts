// Subscription domain events for the event-sourcing package.
import type { SubscriptionStatus, BillingInterval } from "@veritas/contracts";

export const SUBSCRIPTION_CREATED = "subscription.created" as const;
export const SUBSCRIPTION_ACTIVATED = "subscription.activated" as const;
export const SUBSCRIPTION_RENEWED = "subscription.renewed" as const;
export const SUBSCRIPTION_CANCELLED = "subscription.cancelled" as const;
export const SUBSCRIPTION_EXPIRED = "subscription.expired" as const;
export const SUBSCRIPTION_PLAN_CHANGED = "subscription.plan_changed" as const;
export const SUBSCRIPTION_PAST_DUE = "subscription.past_due" as const;
export const SUBSCRIPTION_REACTIVATED = "subscription.reactivated" as const;

export type SubscriptionEventType =
  | typeof SUBSCRIPTION_CREATED
  | typeof SUBSCRIPTION_ACTIVATED
  | typeof SUBSCRIPTION_RENEWED
  | typeof SUBSCRIPTION_CANCELLED
  | typeof SUBSCRIPTION_EXPIRED
  | typeof SUBSCRIPTION_PLAN_CHANGED
  | typeof SUBSCRIPTION_PAST_DUE
  | typeof SUBSCRIPTION_REACTIVATED;

export interface SubscriptionCreatedPayload {
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly billingInterval: BillingInterval;
  readonly trialEndsAt: string | undefined;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
}

export interface SubscriptionActivatedPayload {
  readonly activatedAt: string;
}

export interface SubscriptionRenewedPayload {
  readonly newPeriodStart: string;
  readonly newPeriodEnd: string;
  readonly renewedAt: string;
}

export interface SubscriptionCancelledPayload {
  readonly reason: string;
  readonly cancelledAt: string;
  readonly cancelAtPeriodEnd: boolean;
}

export interface SubscriptionExpiredPayload {
  readonly expiredAt: string;
}

export interface SubscriptionPlanChangedPayload {
  readonly previousPlanId: string;
  readonly newPlanId: string;
  readonly changedAt: string;
}

export interface SubscriptionPastDuePayload {
  readonly pastDueAt: string;
}

export interface SubscriptionReactivatedPayload {
  readonly reactivatedAt: string;
}

export type SubscriptionEventPayload =
  | SubscriptionCreatedPayload
  | SubscriptionActivatedPayload
  | SubscriptionRenewedPayload
  | SubscriptionCancelledPayload
  | SubscriptionExpiredPayload
  | SubscriptionPlanChangedPayload
  | SubscriptionPastDuePayload
  | SubscriptionReactivatedPayload;

export interface SubscriptionState {
  readonly subscriptionId: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly billingInterval: BillingInterval;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: string | undefined;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelledAt: string | undefined;
  readonly cancelAtPeriodEnd: boolean;
}
