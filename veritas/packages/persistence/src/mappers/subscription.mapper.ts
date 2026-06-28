// Mapper between Subscription domain objects and persistence row representation.
import { newId } from "@veritas/core";
import type { Subscription, CreateSubscription, UpdateSubscription } from "@veritas/contracts";

/** Raw persistence row for a Subscription. */
export interface SubscriptionRow {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: string;
  readonly status: string;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a persistence row to a Subscription domain object. */
export function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id as Subscription["id"],
    organizationId: row.organizationId as Subscription["organizationId"],
    planId: row.planId as Subscription["planId"],
    status: row.status as Subscription["status"],
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt as Subscription["createdAt"],
    updatedAt: row.updatedAt as Subscription["updatedAt"],
  };
}

/** Map a CreateSubscription DTO + timestamps into a persistence row. */
export function createDtoToRow(dto: CreateSubscription, now: string): SubscriptionRow {
  const id = newId("sub");
  return {
    id,
    organizationId: dto.organizationId,
    planId: dto.planId,
    status: "TRIALING",
    currentPeriodStart: dto.currentPeriodStart,
    currentPeriodEnd: dto.currentPeriodEnd,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with an UpdateSubscription patch, returning a new row. */
export function mergeRow(existing: SubscriptionRow, patch: UpdateSubscription, now: string): SubscriptionRow {
  return {
    ...existing,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.planId !== undefined ? { planId: patch.planId } : {}),
    ...(patch.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: patch.cancelAtPeriodEnd } : {}),
    ...(patch.cancelledAt !== undefined ? { cancelledAt: patch.cancelledAt } : {}),
    updatedAt: now,
  };
}
