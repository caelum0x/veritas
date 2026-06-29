// Subscription aggregate root managing plan lifecycle via event sourcing.
import { AggregateRoot } from "../aggregate-root.js";
import type { StoredEvent } from "../domain-event.js";
import type { DomainEventMetadata } from "../domain-event.js";
import type { BillingInterval } from "@veritas/contracts";
import {
  SUBSCRIPTION_CREATED,
  SUBSCRIPTION_ACTIVATED,
  SUBSCRIPTION_RENEWED,
  SUBSCRIPTION_CANCELLED,
  SUBSCRIPTION_EXPIRED,
  SUBSCRIPTION_PLAN_CHANGED,
  SUBSCRIPTION_PAST_DUE,
  SUBSCRIPTION_REACTIVATED,
} from "./subscription.events.js";
import type {
  SubscriptionState,
  SubscriptionCreatedPayload,
  SubscriptionActivatedPayload,
  SubscriptionRenewedPayload,
  SubscriptionCancelledPayload,
  SubscriptionExpiredPayload,
  SubscriptionPlanChangedPayload,
  SubscriptionPastDuePayload,
  SubscriptionReactivatedPayload,
} from "./subscription.events.js";

const AGGREGATE_TYPE = "Subscription" as const;

const INITIAL_STATE: SubscriptionState = {
  subscriptionId: "",
  organizationId: "",
  planId: "",
  billingInterval: "MONTHLY",
  status: "TRIALING",
  trialEndsAt: undefined,
  currentPeriodStart: "",
  currentPeriodEnd: "",
  cancelledAt: undefined,
  cancelAtPeriodEnd: false,
};

export class SubscriptionAggregate extends AggregateRoot {
  readonly aggregateType = AGGREGATE_TYPE;

  private _state: SubscriptionState = INITIAL_STATE;

  get id(): string {
    return this._state.subscriptionId;
  }

  get state(): Readonly<SubscriptionState> {
    return this._state;
  }

  static create(
    params: SubscriptionCreatedPayload,
    metadata?: DomainEventMetadata
  ): SubscriptionAggregate {
    const aggregate = new SubscriptionAggregate();
    aggregate.raise(SUBSCRIPTION_CREATED, params, metadata);
    return aggregate;
  }

  activate(activatedAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status !== "TRIALING" && this._state.status !== "PAST_DUE") {
      throw new Error(`Cannot activate subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionActivatedPayload = { activatedAt };
    this.raise(SUBSCRIPTION_ACTIVATED, payload, metadata);
  }

  renew(
    newPeriodStart: string,
    newPeriodEnd: string,
    renewedAt: string,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status !== "ACTIVE") {
      throw new Error(`Cannot renew subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionRenewedPayload = { newPeriodStart, newPeriodEnd, renewedAt };
    this.raise(SUBSCRIPTION_RENEWED, payload, metadata);
  }

  cancel(
    reason: string,
    cancelledAt: string,
    cancelAtPeriodEnd: boolean,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status === "CANCELLED" || this._state.status === "EXPIRED") {
      throw new Error(`Cannot cancel subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionCancelledPayload = { reason, cancelledAt, cancelAtPeriodEnd };
    this.raise(SUBSCRIPTION_CANCELLED, payload, metadata);
  }

  expire(expiredAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status === "EXPIRED") {
      throw new Error("Subscription is already expired");
    }
    const payload: SubscriptionExpiredPayload = { expiredAt };
    this.raise(SUBSCRIPTION_EXPIRED, payload, metadata);
  }

  changePlan(
    newPlanId: string,
    changedAt: string,
    metadata?: DomainEventMetadata
  ): void {
    if (this._state.status !== "ACTIVE" && this._state.status !== "TRIALING") {
      throw new Error(`Cannot change plan of subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionPlanChangedPayload = {
      previousPlanId: this._state.planId,
      newPlanId,
      changedAt,
    };
    this.raise(SUBSCRIPTION_PLAN_CHANGED, payload, metadata);
  }

  markPastDue(pastDueAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status !== "ACTIVE") {
      throw new Error(`Cannot mark past due subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionPastDuePayload = { pastDueAt };
    this.raise(SUBSCRIPTION_PAST_DUE, payload, metadata);
  }

  reactivate(reactivatedAt: string, metadata?: DomainEventMetadata): void {
    if (this._state.status !== "PAST_DUE") {
      throw new Error(`Cannot reactivate subscription in status ${this._state.status}`);
    }
    const payload: SubscriptionReactivatedPayload = { reactivatedAt };
    this.raise(SUBSCRIPTION_REACTIVATED, payload, metadata);
  }

  apply(event: StoredEvent): void {
    switch (event.eventType) {
      case SUBSCRIPTION_CREATED: {
        const p = event.payload as SubscriptionCreatedPayload;
        this._state = {
          ...INITIAL_STATE,
          subscriptionId: p.subscriptionId,
          organizationId: p.organizationId,
          planId: p.planId,
          billingInterval: p.billingInterval as BillingInterval,
          status: p.trialEndsAt ? "TRIALING" : "ACTIVE",
          trialEndsAt: p.trialEndsAt,
          currentPeriodStart: p.currentPeriodStart,
          currentPeriodEnd: p.currentPeriodEnd,
        };
        break;
      }
      case SUBSCRIPTION_ACTIVATED: {
        this._state = { ...this._state, status: "ACTIVE" };
        break;
      }
      case SUBSCRIPTION_RENEWED: {
        const p = event.payload as SubscriptionRenewedPayload;
        this._state = {
          ...this._state,
          currentPeriodStart: p.newPeriodStart,
          currentPeriodEnd: p.newPeriodEnd,
          status: "ACTIVE",
        };
        break;
      }
      case SUBSCRIPTION_CANCELLED: {
        const p = event.payload as SubscriptionCancelledPayload;
        this._state = {
          ...this._state,
          status: p.cancelAtPeriodEnd ? "ACTIVE" : "CANCELLED",
          cancelledAt: p.cancelledAt,
          cancelAtPeriodEnd: p.cancelAtPeriodEnd,
        };
        break;
      }
      case SUBSCRIPTION_EXPIRED: {
        this._state = { ...this._state, status: "EXPIRED" };
        break;
      }
      case SUBSCRIPTION_PLAN_CHANGED: {
        const p = event.payload as SubscriptionPlanChangedPayload;
        this._state = { ...this._state, planId: p.newPlanId };
        break;
      }
      case SUBSCRIPTION_PAST_DUE: {
        this._state = { ...this._state, status: "PAST_DUE" };
        break;
      }
      case SUBSCRIPTION_REACTIVATED: {
        this._state = { ...this._state, status: "ACTIVE" };
        break;
      }
      default:
        break;
    }
  }
}
