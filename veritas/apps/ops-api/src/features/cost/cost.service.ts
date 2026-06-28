// Cost feature service — orchestrates cost events, budgets, alerts, aggregation and reporting via @veritas/cost.
import { ok, err, newId, isErr, asIsoTimestamp, type Result } from "@veritas/core";
import {
  makeCostEvent,
  makeBudget,
  makeBudgetAlert,
  checkAlert,
  applySpend,
  toBudgetStatus,
  type CostEvent,
  type Budget,
  type BudgetAlert,
  type CostReport,
  type CostForecast,
  type CostAllocation,
  type CostStore,
  type CostQuery,
  type CostSummary,
} from "@veritas/cost";
import type {
  InMemoryBudgetRepository,
  InMemoryAllocationRepository,
  InMemoryAlertRepository,
} from "@veritas/cost";
import type { createCostAggregator, createCostOptimizer, createCostReportBuilder } from "@veritas/cost";
import type { Logger } from "@veritas/observability";
import type {
  CreateEventBody,
  CreateBudgetBody,
  CreateBudgetAlertBody,
  AggregateQuery,
  BuildReportBody,
} from "./cost.schema.js";

export interface CostDeps {
  readonly costStore: CostStore;
  readonly budgetRepo: InstanceType<typeof InMemoryBudgetRepository>;
  readonly allocationRepo: InstanceType<typeof InMemoryAllocationRepository>;
  readonly alertRepo: InstanceType<typeof InMemoryAlertRepository>;
  readonly costAggregator: ReturnType<typeof createCostAggregator>;
  readonly costOptimizer: ReturnType<typeof createCostOptimizer>;
  readonly costReportBuilder: ReturnType<typeof createCostReportBuilder>;
  readonly logger: Logger;
}

export class CostFeatureService {
  private readonly store: CostStore;
  private readonly budgetRepo: InstanceType<typeof InMemoryBudgetRepository>;
  private readonly allocationRepo: InstanceType<typeof InMemoryAllocationRepository>;
  private readonly alertRepo: InstanceType<typeof InMemoryAlertRepository>;
  private readonly aggregator: ReturnType<typeof createCostAggregator>;
  private readonly optimizer: ReturnType<typeof createCostOptimizer>;
  private readonly reportBuilder: ReturnType<typeof createCostReportBuilder>;
  private readonly logger: Logger;

  constructor(deps: CostDeps) {
    this.store = deps.costStore;
    this.budgetRepo = deps.budgetRepo;
    this.allocationRepo = deps.allocationRepo;
    this.alertRepo = deps.alertRepo;
    this.aggregator = deps.costAggregator;
    this.optimizer = deps.costOptimizer;
    this.reportBuilder = deps.costReportBuilder;
    this.logger = deps.logger;
  }

  async createEvent(body: CreateEventBody): Promise<Result<CostEvent>> {
    const event = makeCostEvent({
      kind: body.kind,
      tenantId: body.tenantId,
      featureId: body.featureId,
      amountUsdc: body.amountUsdc,
      metadata: body.metadata ?? {},
    });
    const result = await this.store.saveEvent(event);
    if (isErr(result)) return err(result.error);

    // Apply spend to active budgets for this tenant/feature
    const budgets = await this.budgetRepo.findActive(body.tenantId, body.featureId);
    for (const budget of budgets) {
      const updated = applySpend(budget, body.amountUsdc);
      await this.budgetRepo.update(updated);
      // Check alerts for this budget
      const alerts = await this.alertRepo.findByBudget(budget.id);
      for (const alert of alerts) {
        const { alert: checkedAlert, fired } = checkAlert(alert, updated);
        await this.alertRepo.update(checkedAlert);
        if (fired) {
          this.logger.info("budget_alert_fired", {
            alertId: checkedAlert.id,
            budgetId: budget.id,
            severity: checkedAlert.severity,
            utilizationPct: checkedAlert.currentUtilizationPct,
          });
        }
      }
    }

    return ok(result.value);
  }

  async getEvent(id: string): Promise<Result<CostEvent>> {
    return this.store.getEvent(id);
  }

  async listEvents(query: CostQuery): Promise<Result<readonly CostEvent[]>> {
    return this.store.listEvents(query);
  }

  async createBudget(body: CreateBudgetBody): Promise<Result<Budget>> {
    const budget = makeBudget({
      name: body.name,
      scope: body.scope,
      tenantId: body.tenantId,
      featureId: body.featureId,
      limitUsdc: body.limitUsdc,
      period: body.period,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });
    const saved = await this.budgetRepo.create(budget);
    const result = await this.store.saveBudget(saved);
    if (isErr(result)) return err(result.error);
    return ok(saved);
  }

  async getBudget(id: string): Promise<Result<Budget>> {
    return this.store.getBudget(id);
  }

  async listBudgets(tenantId?: string): Promise<Result<readonly Budget[]>> {
    return this.store.listBudgets(tenantId);
  }

  async createBudgetAlert(body: CreateBudgetAlertBody): Promise<Result<BudgetAlert>> {
    const budgetResult = await this.store.getBudget(body.budgetId);
    if (isErr(budgetResult)) return err(budgetResult.error);

    const alert = makeBudgetAlert({
      budgetId: body.budgetId,
      thresholdPct: body.thresholdPct,
      severity: body.severity,
    });
    const saved = await this.alertRepo.create(alert);
    const storeResult = await this.store.saveAlert(saved);
    if (isErr(storeResult)) return err(storeResult.error);
    return ok(saved);
  }

  async listAlerts(budgetId?: string): Promise<Result<readonly BudgetAlert[]>> {
    return this.store.listAlerts(budgetId);
  }

  async listAllocations(query: CostQuery): Promise<Result<readonly CostAllocation[]>> {
    return this.store.listAllocations(query);
  }

  async aggregate(query: AggregateQuery): Promise<Result<readonly CostSummary[]>> {
    const costQuery: CostQuery = {
      tenantId: query.tenantId,
      from: query.from,
      to: query.to,
      limit: 500,
    };
    const eventsResult = await this.store.listEvents(costQuery);
    if (isErr(eventsResult)) return err(eventsResult.error);

    const summaries = this.aggregator.aggregate(eventsResult.value, {
      start: asIsoTimestamp(query.from),
      end: asIsoTimestamp(query.to),
    });
    return ok(summaries);
  }

  async buildReport(body: BuildReportBody): Promise<Result<CostReport>> {
    const window = {
      start: asIsoTimestamp(body.from),
      end: asIsoTimestamp(body.to),
    };

    const eventsResult = await this.store.listEvents({
      tenantId: body.tenantId,
      from: body.from,
      to: body.to,
      limit: 500,
    });
    if (isErr(eventsResult)) return err(eventsResult.error);

    const summaries = this.aggregator.aggregate(eventsResult.value, window);

    const budgetsResult = await this.store.listBudgets(body.tenantId);
    const budgetStatuses = isErr(budgetsResult)
      ? []
      : budgetsResult.value.map(toBudgetStatus);

    const hints = this.optimizer.analyze(summaries, []);

    const report = this.reportBuilder.build({
      id: newId("report"),
      window,
      summaries,
      hints,
      budgetStatuses,
      metadata: body.metadata ?? {},
    });

    const saveResult = await this.store.saveReport(report);
    if (isErr(saveResult)) return err(saveResult.error);
    return ok(report);
  }

  async listReports(tenantId?: string): Promise<Result<readonly CostReport[]>> {
    return this.store.listReports(tenantId);
  }

  async listForecasts(tenantId?: string): Promise<Result<readonly CostForecast[]>> {
    return this.store.listForecasts(tenantId);
  }
}
