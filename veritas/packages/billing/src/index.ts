// Public barrel: re-exports all modules of the @veritas/billing package.

// UsageMetric is the canonical re-export from metering; other modules re-declare it locally.
export * from "./metering.js";
// usage-aggregator, plans, pricing, quota all re-declare UsageMetric — export everything except it.
export { aggregateUsage, filterByOrg, filterByPeriod, type PeriodUsage, type AggregationGranularity } from "./usage-aggregator.js";
export { getPlanById, getLimitForMetric, isWithinLimit, PLAN_CATALOG, type Plan, type PlanLimit, type BillingInterval } from "./plans.js";
export { computeCharges, formatUsdcAmount, PRICING_TIERS, type MetricRate, type PricingTier, type LineItem, type ChargeResult } from "./pricing.js";
export * from "./invoice-generator.js";
export * from "./ledger.js";
export * from "./usdc-accounting.js";
export * from "./money.js";
export * from "./reports.js";
export { QuotaEnforcer, type QuotaStatus, type QuotaCheckRequest, type QuotaEnforcerOptions } from "./quota.js";
export * from "./errors.js";
