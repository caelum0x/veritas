// In-memory CostStore implementation satisfying the CostStore port interface
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { CostEvent } from "./cost-event.js";
import type { Budget } from "./budget.js";
import type { BudgetAlert } from "./alert.js";
import type { CostReport } from "./report.js";
import type { CostStore, CostQuery, CostAllocation, CostForecast } from "./types.js";
import {
  CostStoreError,
  CostEventNotFoundError,
  AllocationNotFoundError,
  BudgetNotFoundError,
} from "./errors.js";

function matchesQuery(
  item: { tenantId?: string; featureId?: string; occurredAt?: string; allocatedAt?: string; createdAt?: string },
  query: CostQuery,
): boolean {
  if (query.tenantId !== undefined && item.tenantId !== query.tenantId) return false;
  if (query.featureId !== undefined && item.featureId !== query.featureId) return false;
  const timestamp = item.occurredAt ?? item.allocatedAt ?? item.createdAt;
  if (query.from !== undefined && timestamp !== undefined && timestamp < query.from) return false;
  if (query.to !== undefined && timestamp !== undefined && timestamp > query.to) return false;
  return true;
}

function paginate<T>(items: readonly T[], query: CostQuery): readonly T[] {
  const start = query.cursor ? parseInt(query.cursor, 10) : 0;
  return items.slice(start, start + query.limit);
}

export class InMemoryCostStore implements CostStore {
  private readonly events = new Map<string, CostEvent>();
  private readonly allocations = new Map<string, CostAllocation>();
  private readonly budgets = new Map<string, Budget>();
  private readonly alerts = new Map<string, BudgetAlert>();
  private readonly reports = new Map<string, CostReport>();
  private readonly forecasts = new Map<string, CostForecast>();

  async saveEvent(event: CostEvent): Promise<Result<CostEvent, CostStoreError>> {
    try {
      this.events.set(event.id, event);
      return ok(event);
    } catch (e) {
      return err(new CostStoreError(`Failed to save event: ${String(e)}`));
    }
  }

  async getEvent(id: string): Promise<Result<CostEvent, CostStoreError | CostEventNotFoundError>> {
    const event = this.events.get(id);
    if (event === undefined) return err(new CostEventNotFoundError(id));
    return ok(event);
  }

  async listEvents(query: CostQuery): Promise<Result<readonly CostEvent[], CostStoreError>> {
    const all = Array.from(this.events.values()).filter((e) =>
      matchesQuery({ tenantId: e.tenantId, featureId: e.featureId, occurredAt: e.occurredAt }, query),
    );
    return ok(paginate(all, query));
  }

  async saveAllocation(allocation: CostAllocation): Promise<Result<CostAllocation, CostStoreError>> {
    try {
      this.allocations.set(allocation.id, allocation);
      return ok(allocation);
    } catch (e) {
      return err(new CostStoreError(`Failed to save allocation: ${String(e)}`));
    }
  }

  async getAllocation(id: string): Promise<Result<CostAllocation, CostStoreError | AllocationNotFoundError>> {
    const allocation = this.allocations.get(id);
    if (allocation === undefined) return err(new AllocationNotFoundError(id));
    return ok(allocation);
  }

  async listAllocations(query: CostQuery): Promise<Result<readonly CostAllocation[], CostStoreError>> {
    const all = Array.from(this.allocations.values()).filter((a) =>
      matchesQuery({ tenantId: a.tenantId, allocatedAt: a.allocatedAt }, query),
    );
    return ok(paginate(all, query));
  }

  async saveBudget(budget: Budget): Promise<Result<Budget, CostStoreError>> {
    try {
      this.budgets.set(budget.id, budget);
      return ok(budget);
    } catch (e) {
      return err(new CostStoreError(`Failed to save budget: ${String(e)}`));
    }
  }

  async getBudget(id: string): Promise<Result<Budget, CostStoreError | BudgetNotFoundError>> {
    const budget = this.budgets.get(id);
    if (budget === undefined) return err(new BudgetNotFoundError(id));
    return ok(budget);
  }

  async listBudgets(tenantId?: string): Promise<Result<readonly Budget[], CostStoreError>> {
    const all = Array.from(this.budgets.values()).filter(
      (b) => tenantId === undefined || b.tenantId === tenantId,
    );
    return ok(all);
  }

  async saveAlert(alert: BudgetAlert): Promise<Result<BudgetAlert, CostStoreError>> {
    try {
      this.alerts.set(alert.id, alert);
      return ok(alert);
    } catch (e) {
      return err(new CostStoreError(`Failed to save alert: ${String(e)}`));
    }
  }

  async listAlerts(budgetId?: string): Promise<Result<readonly BudgetAlert[], CostStoreError>> {
    const all = Array.from(this.alerts.values()).filter(
      (a) => budgetId === undefined || a.budgetId === budgetId,
    );
    return ok(all);
  }

  async saveReport(report: CostReport): Promise<Result<CostReport, CostStoreError>> {
    try {
      this.reports.set(report.id, report);
      return ok(report);
    } catch (e) {
      return err(new CostStoreError(`Failed to save report: ${String(e)}`));
    }
  }

  async listReports(tenantId?: string): Promise<Result<readonly CostReport[], CostStoreError>> {
    const all = Array.from(this.reports.values()).filter(
      (r) =>
        tenantId === undefined ||
        r.lines.some((l) => l.tenantId === tenantId),
    );
    return ok(all);
  }

  async saveForecast(forecast: CostForecast): Promise<Result<CostForecast, CostStoreError>> {
    try {
      this.forecasts.set(forecast.id, forecast);
      return ok(forecast);
    } catch (e) {
      return err(new CostStoreError(`Failed to save forecast: ${String(e)}`));
    }
  }

  async listForecasts(tenantId?: string): Promise<Result<readonly CostForecast[], CostStoreError>> {
    const all = Array.from(this.forecasts.values()).filter(
      (f) => tenantId === undefined || f.tenantId === tenantId,
    );
    return ok(all);
  }
}

export function createInMemoryCostStore(): CostStore {
  return new InMemoryCostStore();
}
