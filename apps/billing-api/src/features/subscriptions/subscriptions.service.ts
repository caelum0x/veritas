// Subscription service: orchestrates plan retrieval, subscription lifecycle, and dunning via packages.

import {
  ok,
  err,
  isErr,
  newId,
  epochToIso,
  type Result,
  type Id,
  NotFoundError,
} from "@veritas/core";
import {
  PLAN_CATALOG,
  getPlanById,
  InvoiceGenerator,
  type Plan,
  Ledger,
} from "@veritas/billing";
import {
  type Subscription,
  type CreateSubscription,
  type UpdateSubscription,
} from "@veritas/contracts";
import {
  createDunningProcess,
  cancelDunningProcess,
  type DunningStore,
} from "@veritas/dunning";
import { createRevenueStore, type RevenueStore } from "@veritas/revenue";
import type { Logger } from "@veritas/observability";
import type { CreateSubscriptionBody, UpdateSubscriptionBody } from "./subscriptions.schema.js";

/** In-process subscription store (replaced by DB adapter in production). */
const subscriptions = new Map<string, Subscription>();

export interface SubscriptionServiceDeps {
  readonly logger: Logger;
  readonly ledger: Ledger;
  readonly dunningStore: DunningStore;
  readonly revenueStore: RevenueStore;
}

export class SubscriptionService {
  private readonly logger: Logger;
  private readonly ledger: Ledger;
  private readonly dunningStore: DunningStore;
  private readonly revenueStore: RevenueStore;

  constructor(deps: SubscriptionServiceDeps) {
    this.logger = deps.logger;
    this.ledger = deps.ledger;
    this.dunningStore = deps.dunningStore;
    this.revenueStore = deps.revenueStore;
  }

  listPlans(includeInactive = false): readonly Plan[] {
    return includeInactive ? PLAN_CATALOG : PLAN_CATALOG.filter((p) => p.isActive);
  }

  getPlan(planId: string): Result<Plan, NotFoundError> {
    const plan = getPlanById(planId);
    if (plan === undefined) {
      return err(new NotFoundError({ message: `Plan '${planId}' not found` }));
    }
    return ok(plan);
  }

  createSubscription(body: CreateSubscriptionBody): Result<Subscription, NotFoundError> {
    const planResult = this.getPlan(body.planId);
    if (isErr(planResult)) return err(planResult.error);

    const plan = planResult.value;
    const now = epochToIso(Date.now());

    const sub: Subscription = {
      id: newId("sub") as Id<"sub">,
      organizationId: body.organizationId as Id<"org">,
      planId: body.planId as Id<"plan">,
      status: plan.trialDays > 0 ? "TRIALING" : "ACTIVE",
      currentPeriodStart: body.currentPeriodStart,
      currentPeriodEnd: body.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    subscriptions.set(sub.id, sub);

    // Record subscription in revenue store for MRR tracking.
    this.revenueStore.addSubscription({
      organizationId: body.organizationId,
      planId: body.planId,
      status: sub.status === "TRIALING" ? "trialing" : "active",
      billingInterval: plan.interval,
      monthlyBaseUnits: plan.basePrice,
      startedAt: now,
      canceledAt: null,
    });

    // Append initial charge event to ledger.
    this.ledger.append(
      body.organizationId as Id<"org">,
      "charge",
      { amount: plan.basePrice, currency: "USDC" as const },
      `Subscription created: ${plan.name}`,
      { referenceId: sub.id as unknown as Id<string> },
    );

    this.logger.info("subscription.created", {
      subscriptionId: sub.id,
      organizationId: body.organizationId,
      planId: body.planId,
      status: sub.status,
    });

    return ok(sub);
  }

  getSubscription(subscriptionId: string): Result<Subscription, NotFoundError> {
    const sub = subscriptions.get(subscriptionId);
    if (sub === undefined) {
      return err(new NotFoundError({ message: `Subscription '${subscriptionId}' not found` }));
    }
    return ok(sub);
  }

  listSubscriptions(params: {
    organizationId?: string;
    status?: Subscription["status"];
    limit: number;
    cursor?: string;
  }): readonly Subscription[] {
    let result = [...subscriptions.values()];

    if (params.organizationId !== undefined) {
      result = result.filter((s) => s.organizationId === params.organizationId);
    }
    if (params.status !== undefined) {
      result = result.filter((s) => s.status === params.status);
    }
    if (params.cursor !== undefined) {
      const idx = result.findIndex((s) => s.id === params.cursor);
      if (idx !== -1) result = result.slice(idx + 1);
    }

    return result.slice(0, params.limit);
  }

  updateSubscription(
    subscriptionId: string,
    body: UpdateSubscriptionBody,
  ): Result<Subscription, NotFoundError> {
    const existing = subscriptions.get(subscriptionId);
    if (existing === undefined) {
      return err(new NotFoundError({ message: `Subscription '${subscriptionId}' not found` }));
    }

    const updated: Subscription = {
      ...existing,
      ...(body.status !== undefined && { status: body.status }),
      ...(body.planId !== undefined && { planId: body.planId as Id<"plan"> }),
      ...(body.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: body.cancelAtPeriodEnd }),
      updatedAt: epochToIso(Date.now()),
    };

    subscriptions.set(subscriptionId, updated);

    this.logger.info("subscription.updated", {
      subscriptionId,
      changes: Object.keys(body),
    });

    return ok(updated);
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean,
  ): Promise<Result<Subscription, NotFoundError>> {
    const existing = subscriptions.get(subscriptionId);
    if (existing === undefined) {
      return err(new NotFoundError({ message: `Subscription '${subscriptionId}' not found` }));
    }

    const now = epochToIso(Date.now());
    const updated: Subscription = {
      ...existing,
      status: immediately ? "CANCELLED" : existing.status,
      cancelAtPeriodEnd: !immediately,
      cancelledAt: immediately ? now : null,
      updatedAt: now,
    };

    subscriptions.set(subscriptionId, updated);

    // Attempt to cancel any active dunning process for this subscription.
    const dunningResult = await this.dunningStore.findDunningBySubscription(subscriptionId);
    if (!isErr(dunningResult) && dunningResult.value !== undefined) {
      const process = dunningResult.value;
      const cancelResult = cancelDunningProcess(process, "subscription_cancelled");
      if (!isErr(cancelResult)) {
        await this.dunningStore.saveDunning(cancelResult.value);
      }
    }

    // Update revenue store.
    this.revenueStore.removeSubscription(existing.organizationId, existing.planId);

    this.logger.info("subscription.cancelled", {
      subscriptionId,
      immediately,
      organizationId: existing.organizationId,
    });

    return ok(updated);
  }

  async triggerDunning(
    subscriptionId: string,
    amountCents: number,
  ): Promise<Result<{ dunningId: string }, NotFoundError>> {
    const existing = subscriptions.get(subscriptionId);
    if (existing === undefined) {
      return err(new NotFoundError({ message: `Subscription '${subscriptionId}' not found` }));
    }

    const process = createDunningProcess({
      subscriptionId,
      organizationId: existing.organizationId,
      amountCents,
      currency: "USDC",
    });

    await this.dunningStore.saveDunning(process);

    this.logger.info("dunning.triggered", {
      dunningId: process.id,
      subscriptionId,
      organizationId: existing.organizationId,
      amountCents,
    });

    return ok({ dunningId: process.id });
  }
}
