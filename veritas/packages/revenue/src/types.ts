// Shared types for the @veritas/revenue module.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue } from "@veritas/billing";

/** A labeled money value with an optional period annotation. */
export interface RevenueAmount {
  readonly value: MoneyValue;
  readonly label: string;
  readonly periodStart?: IsoTimestamp;
  readonly periodEnd?: IsoTimestamp;
}

/** Direction of a revenue movement. */
export type RevenueMovement = "expansion" | "contraction" | "churn" | "new" | "reactivation";

/** A single revenue movement event tied to an organization. */
export interface RevenueEvent {
  readonly organizationId: string;
  readonly movement: RevenueMovement;
  readonly amount: MoneyValue;
  readonly occurredAt: IsoTimestamp;
  readonly planId?: string;
  readonly notes?: string;
}

/** Aggregated revenue movements for a period. */
export interface MovementSummary {
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly newMrr: MoneyValue;
  readonly expansionMrr: MoneyValue;
  readonly contractionMrr: MoneyValue;
  readonly churnMrr: MoneyValue;
  readonly reactivationMrr: MoneyValue;
  readonly netNewMrr: MoneyValue;
}

/** Customer Acquisition Cost inputs. */
export interface CacInputs {
  /** Total sales and marketing spend for the period. */
  readonly totalSpend: MoneyValue;
  /** Number of new customers acquired in the period. */
  readonly newCustomers: number;
}

/** Customer Acquisition Cost result. */
export interface CacResult {
  readonly cacPerCustomer: MoneyValue;
  readonly paybackMonths: number | null;
  readonly totalSpend: MoneyValue;
  readonly newCustomers: number;
}

/** Revenue recognition entry per period for a subscription. */
export interface RecognitionEntry {
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly recognizedAmount: MoneyValue;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  /** True when the amount has been fully earned (period has closed). */
  readonly isEarned: boolean;
}

/** Aggregated revenue recognition schedule. */
export interface RecognitionSchedule {
  readonly entries: readonly RecognitionEntry[];
  readonly totalEarned: MoneyValue;
  readonly totalDeferred: MoneyValue;
  readonly generatedAt: IsoTimestamp;
}

/** Summary stats for a revenue report. */
export interface RevenueMetrics {
  readonly mrr: MoneyValue;
  readonly arr: MoneyValue;
  readonly netNewMrr: MoneyValue;
  readonly churnMrr: MoneyValue;
  readonly expansionMrr: MoneyValue;
  readonly ltv: MoneyValue | null;
  readonly cac: MoneyValue | null;
  readonly ltvToCacRatio: number | null;
  readonly activeSubscriptions: number;
  readonly asOf: IsoTimestamp;
}
