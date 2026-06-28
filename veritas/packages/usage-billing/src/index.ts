// index.ts: public surface of the @veritas/usage-billing module.

export type { UsageMetric, BillingPeriod, OrgMetricKey, MetricAggregate, ChargeLineItem, RatedCharges } from "./types.js";

export {
  UsageLimitExceededError,
  MeterNotFoundError,
  InvalidUsageQuantityError,
  BillingWindowError,
  AggregationError,
} from "./errors.js";

export {
  UsageEventSchema,
  createUsageEvent,
  parseUsageEvent,
} from "./event.js";
export type { UsageEvent, CreateUsageEventOptions } from "./event.js";

export { UsageMeter } from "./meter.js";
export type { MeterOptions } from "./meter.js";

export {
  BillableMetricSchema,
  createBillableMetric,
  isWithinHardCap,
  overageQuantity,
} from "./billable.js";
export type { BillableMetric } from "./billable.js";

export { computeOverages } from "./overage.js";
export type { OverageInput, OverageLine, OverageResult } from "./overage.js";
