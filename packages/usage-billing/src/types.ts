// types.ts: shared types for the @veritas/usage-billing module.

import { z } from "zod";
import { UsageMetricSchema } from "@veritas/contracts";
import { Id, IsoTimestamp } from "@veritas/core";

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export interface BillingPeriod {
  readonly start: IsoTimestamp;
  readonly end: IsoTimestamp;
}

export interface OrgMetricKey {
  readonly organizationId: Id<string>;
  readonly metric: UsageMetric;
}

/** Aggregate usage total for one metric within a billing period. */
export interface MetricAggregate {
  readonly metric: UsageMetric;
  readonly organizationId: Id<string>;
  readonly period: BillingPeriod;
  readonly totalQuantity: number;
  readonly eventCount: number;
}

/** A charge line item for one metric: quantity and amount in USDC micro-units. */
export interface ChargeLineItem {
  readonly metric: UsageMetric;
  readonly quantity: number;
  readonly unitPrice: bigint;
  readonly amount: bigint;
  readonly description: string;
}

/** Summary of rated charges for a billing period. */
export interface RatedCharges {
  readonly organizationId: Id<string>;
  readonly period: BillingPeriod;
  readonly lines: readonly ChargeLineItem[];
  readonly totalAmount: bigint;
}
