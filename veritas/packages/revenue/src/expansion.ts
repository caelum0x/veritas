// Expansion and contraction MRR analysis: tracks upgrades, downgrades, churn, and reactivations.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, addMoney, zeroMoney, fromBaseUnits } from "@veritas/billing";
import { SubscriptionRecord } from "./mrr.js";

export type ExpansionEventKind =
  | "new"        // brand new subscription
  | "expansion"  // upgrade to higher MRR
  | "contraction" // downgrade to lower MRR
  | "churn"      // cancellation
  | "reactivation"; // reactivated after cancel

export interface ExpansionEvent {
  readonly organizationId: string;
  readonly kind: ExpansionEventKind;
  readonly month: string;
  /** MRR delta in base units (positive = growth, negative = loss). */
  readonly mrrDeltaUnits: bigint;
  readonly fromPlanId: string | null;
  readonly toPlanId: string | null;
}

export interface ExpansionSummary {
  readonly month: string;
  readonly newMrr: MoneyValue;
  readonly expansionMrr: MoneyValue;
  readonly contractionMrr: MoneyValue;
  readonly churnMrr: MoneyValue;
  readonly reactivationMrr: MoneyValue;
  /** Net MRR movement = new + expansion + reactivation - contraction - churn */
  readonly netMovement: MoneyValue;
  readonly events: readonly ExpansionEvent[];
}

/** Previous subscription state used for delta comparison. */
export interface PrevSubState {
  readonly organizationId: string;
  readonly planId: string;
  readonly monthlyBaseUnits: bigint;
  readonly status: SubscriptionRecord["status"];
}

function toYearMonth(ts: IsoTimestamp): string {
  return ts.slice(0, 7);
}

function absoluteDelta(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : b - a;
}

/** Computes expansion/contraction events by comparing month-over-month subscription states. */
export function computeExpansionEvents(
  previous: readonly PrevSubState[],
  current: readonly SubscriptionRecord[],
  month: string
): readonly ExpansionEvent[] {
  const prevByOrg = new Map<string, PrevSubState>();
  for (const p of previous) {
    prevByOrg.set(p.organizationId, p);
  }

  const currByOrg = new Map<string, SubscriptionRecord>();
  for (const c of current) {
    if (toYearMonth(c.startedAt) <= month) {
      currByOrg.set(c.organizationId, c);
    }
  }

  const events: ExpansionEvent[] = [];
  const allOrgIds = new Set([...prevByOrg.keys(), ...currByOrg.keys()]);

  for (const orgId of allOrgIds) {
    const prev = prevByOrg.get(orgId) ?? null;
    const curr = currByOrg.get(orgId) ?? null;

    if (prev === null && curr !== null) {
      const isNew = toYearMonth(curr.startedAt) === month;
      const kind: ExpansionEventKind = isNew ? "new" : "reactivation";
      events.push({
        organizationId: orgId,
        kind,
        month,
        mrrDeltaUnits: curr.monthlyBaseUnits,
        fromPlanId: null,
        toPlanId: curr.planId,
      });
    } else if (prev !== null && curr === null) {
      events.push({
        organizationId: orgId,
        kind: "churn",
        month,
        mrrDeltaUnits: -prev.monthlyBaseUnits,
        fromPlanId: prev.planId,
        toPlanId: null,
      });
    } else if (prev !== null && curr !== null) {
      if (curr.monthlyBaseUnits > prev.monthlyBaseUnits) {
        events.push({
          organizationId: orgId,
          kind: "expansion",
          month,
          mrrDeltaUnits: curr.monthlyBaseUnits - prev.monthlyBaseUnits,
          fromPlanId: prev.planId,
          toPlanId: curr.planId,
        });
      } else if (curr.monthlyBaseUnits < prev.monthlyBaseUnits) {
        events.push({
          organizationId: orgId,
          kind: "contraction",
          month,
          mrrDeltaUnits: -(prev.monthlyBaseUnits - curr.monthlyBaseUnits),
          fromPlanId: prev.planId,
          toPlanId: curr.planId,
        });
      }
    }
  }

  return events;
}

/** Aggregates expansion events into a monthly summary. */
export function summarizeExpansion(
  events: readonly ExpansionEvent[],
  month: string
): ExpansionSummary {
  let newMrr = zeroMoney();
  let expansionMrr = zeroMoney();
  let contractionMrr = zeroMoney();
  let churnMrr = zeroMoney();
  let reactivationMrr = zeroMoney();

  for (const ev of events) {
    const abs = fromBaseUnits(ev.mrrDeltaUnits < 0n ? -ev.mrrDeltaUnits : ev.mrrDeltaUnits);
    switch (ev.kind) {
      case "new": newMrr = addMoney(newMrr, abs); break;
      case "expansion": expansionMrr = addMoney(expansionMrr, abs); break;
      case "contraction": contractionMrr = addMoney(contractionMrr, abs); break;
      case "churn": churnMrr = addMoney(churnMrr, abs); break;
      case "reactivation": reactivationMrr = addMoney(reactivationMrr, abs); break;
    }
  }

  const gains = addMoney(addMoney(newMrr, expansionMrr), reactivationMrr);
  const losses = addMoney(contractionMrr, churnMrr);
  const netUnits = gains.amount >= losses.amount ? gains.amount - losses.amount : 0n;
  const netMovement = fromBaseUnits(netUnits);

  return {
    month,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnMrr,
    reactivationMrr,
    netMovement,
    events,
  };
}
