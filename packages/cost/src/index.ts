// Public surface re-export for @veritas/cost
export {
  CostEventKindSchema,
  CostEventSchema,
  makeCostEvent,
} from "./cost-event.js";
export type { CostEventKind, CostEvent, CreateCostEventInput } from "./cost-event.js";

export {
  AllocationSchema,
  InMemoryAllocationRepository,
} from "./allocation.js";
export type {
  Allocation,
  AllocationKey,
  AllocationRepository,
} from "./allocation.js";

export {
  BudgetScopeSchema,
  BudgetPeriodSchema,
  BudgetSchema,
  makeBudget,
  applySpend,
  remainingBudget,
  utilizationRate,
  InMemoryBudgetRepository,
} from "./budget.js";
export type {
  BudgetScope,
  BudgetPeriod,
  Budget,
  CreateBudgetInput,
  BudgetRepository,
  BudgetStatus,
} from "./budget.js";
export { toBudgetStatus } from "./budget.js";

export {
  AlertSeveritySchema,
  BudgetAlertSchema,
  makeBudgetAlert,
  checkAlert,
  NoopAlertNotifier,
  LoggingAlertNotifier,
  InMemoryAlertRepository,
} from "./alert.js";
export type {
  AlertSeverity,
  BudgetAlert,
  CreateBudgetAlertInput,
  AlertCheckResult,
  AlertNotifier,
  AlertRepository,
} from "./alert.js";

export {
  ModelTierSchema,
  ModelCostConfigSchema,
  computeModelCost,
  makeModelCostConfig,
  InMemoryModelCostRepository,
  DEFAULT_MODEL_COSTS,
} from "./model-cost.js";
export type {
  ModelTier,
  ModelCostConfig,
  TokenUsage,
  ModelInferenceCost,
  ModelCostRepository,
} from "./model-cost.js";

export {
  InfraResourceKindSchema,
  InfraUnitPriceSchema,
  InfraUsageSchema,
  InfraCostLineSchema,
  createInfraCostModel,
} from "./infra-cost.js";
export type {
  InfraResourceKind,
  InfraUnitPrice,
  InfraUsage,
  InfraCostLine,
  InfraCostModel,
} from "./infra-cost.js";

export { createCostAggregator } from "./aggregator.js";
export type { CostSummary, AggregationWindow, CostAggregator } from "./aggregator.js";

export { createCostOptimizer } from "./optimizer.js";
export type {
  OptimizationSeverity,
  OptimizationHint,
  OptimizerConfig,
  CostOptimizer,
} from "./optimizer.js";

export { createCostReportBuilder } from "./report.js";
export type { CostReportLine, CostReport, CostReportBuilder } from "./report.js";

export {
  CostAllocationSchema,
  CostForecastSchema,
  CostQuerySchema,
  SpendSnapshotSchema,
} from "./types.js";
export type {
  CostAllocation,
  CostForecast,
  CostQuery,
  SpendSnapshot,
  CostStore,
  CostStoreWriteError,
  CostStoreReadError,
} from "./types.js";

export {
  BudgetNotFoundError,
  BudgetExceededError,
  AllocationNotFoundError,
  CostEventNotFoundError,
  CostStoreError,
} from "./errors.js";

export { createInMemoryCostStore, InMemoryCostStore } from "./store.js";
