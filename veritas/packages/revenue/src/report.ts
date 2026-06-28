// Composes a comprehensive revenue report from MRR, ARR, LTV, CAC and forecast data.

import { IsoTimestamp } from "@veritas/core";
import { MoneyValue, formatMoney, zeroMoney } from "@veritas/billing";
import { MrrSnapshot, mrrGrowthRate, mrrDelta, isMrrGrowth } from "./mrr.js";
import { RevenueForecast } from "./forecast.js";
import { LtvResult } from "./ltv.js";
import { CacResult, PaybackResult } from "./cac.js";

export interface RevenueReportPeriod {
  readonly startAt: IsoTimestamp;
  readonly endAt: IsoTimestamp;
}

export interface RevenueReport {
  readonly generatedAt: IsoTimestamp;
  readonly period: RevenueReportPeriod;

  readonly mrr: {
    readonly current: MoneyValue;
    readonly previous: MoneyValue;
    readonly delta: MoneyValue;
    readonly isGrowth: boolean;
    readonly growthRate: number | null;
    readonly activeSubscriptions: number;
  };

  readonly arr: {
    readonly current: MoneyValue;
    readonly previous: MoneyValue;
  };

  readonly ltv: LtvResult | null;
  readonly cac: CacResult | null;
  readonly payback: PaybackResult | null;
  readonly forecast: RevenueForecast | null;

  readonly summary: {
    readonly currentMrrFormatted: string;
    readonly arrFormatted: string;
    readonly growthRatePct: string;
    readonly ltvToCac: string;
  };
}

export interface RevenueReportInputs {
  readonly period: RevenueReportPeriod;
  readonly currentSnapshot: MrrSnapshot;
  readonly previousSnapshot: MrrSnapshot;
  readonly currentArr: MoneyValue;
  readonly previousArr: MoneyValue;
  readonly ltv?: LtvResult;
  readonly cac?: CacResult;
  readonly payback?: PaybackResult;
  readonly forecast?: RevenueForecast;
  readonly generatedAt: IsoTimestamp;
}

function formatGrowthRate(rate: number | null): string {
  if (rate === null) return "N/A";
  return `${(rate * 100).toFixed(2)}%`;
}

function formatLtvToCac(ltv: LtvResult | null): string {
  if (!ltv || ltv.ltvToCacRatio === null) return "N/A";
  return ltv.ltvToCacRatio.toFixed(2) + "x";
}

/** Assembles all revenue metrics into a single immutable report object. */
export function buildRevenueReport(inputs: RevenueReportInputs): RevenueReport {
  const { currentSnapshot, previousSnapshot } = inputs;

  const delta = mrrDelta(previousSnapshot, currentSnapshot);
  const isGrowth = isMrrGrowth(previousSnapshot, currentSnapshot);
  const growthRate = mrrGrowthRate(previousSnapshot, currentSnapshot);

  const mrr = {
    current: currentSnapshot.total,
    previous: previousSnapshot.total,
    delta,
    isGrowth,
    growthRate,
    activeSubscriptions: currentSnapshot.activeCount,
  };

  const arr = {
    current: inputs.currentArr,
    previous: inputs.previousArr,
  };

  const ltv = inputs.ltv ?? null;
  const cac = inputs.cac ?? null;
  const payback = inputs.payback ?? null;
  const forecast = inputs.forecast ?? null;

  const summary = {
    currentMrrFormatted: formatMoney(currentSnapshot.total),
    arrFormatted: formatMoney(inputs.currentArr),
    growthRatePct: formatGrowthRate(growthRate),
    ltvToCac: formatLtvToCac(ltv),
  };

  return {
    generatedAt: inputs.generatedAt,
    period: inputs.period,
    mrr,
    arr,
    ltv,
    cac,
    payback,
    forecast,
    summary,
  };
}
