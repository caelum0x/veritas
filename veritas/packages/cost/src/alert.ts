// Budget alert: triggers when spending crosses configurable utilization thresholds
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import type { Budget } from "./budget.js";
import { utilizationRate } from "./budget.js";

export const AlertSeveritySchema = z.enum(["info", "warning", "critical"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const BudgetAlertSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  thresholdPct: z.number().min(0).max(100),
  severity: AlertSeveritySchema,
  triggered: z.boolean().default(false),
  triggeredAt: z.string().optional(),
  currentUtilizationPct: z.number().nonnegative().optional(),
  createdAt: z.string(),
});
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

export interface CreateBudgetAlertInput {
  readonly budgetId: string;
  readonly thresholdPct: number;
  readonly severity: AlertSeverity;
}

export function makeBudgetAlert(input: CreateBudgetAlertInput): BudgetAlert {
  const now = epochToIso(Date.now());
  return BudgetAlertSchema.parse({
    id: newId("alert"),
    budgetId: input.budgetId,
    thresholdPct: input.thresholdPct,
    severity: input.severity,
    triggered: false,
    createdAt: now,
  });
}

export interface AlertCheckResult {
  readonly alert: BudgetAlert;
  readonly fired: boolean;
}

export function checkAlert(alert: BudgetAlert, budget: Budget): AlertCheckResult {
  const utilPct = utilizationRate(budget) * 100;
  const shouldFire = utilPct >= alert.thresholdPct;

  if (shouldFire && !alert.triggered) {
    const fired: BudgetAlert = BudgetAlertSchema.parse({
      ...alert,
      triggered: true,
      triggeredAt: epochToIso(Date.now()),
      currentUtilizationPct: utilPct,
    });
    return { alert: fired, fired: true };
  }

  const updated: BudgetAlert = BudgetAlertSchema.parse({
    ...alert,
    currentUtilizationPct: utilPct,
  });
  return { alert: updated, fired: false };
}

export interface AlertNotifier {
  notify(alert: BudgetAlert, budget: Budget): Promise<void>;
}

export class NoopAlertNotifier implements AlertNotifier {
  async notify(_alert: BudgetAlert, _budget: Budget): Promise<void> {}
}

export class LoggingAlertNotifier implements AlertNotifier {
  constructor(private readonly log: (msg: string, data: unknown) => void) {}

  async notify(alert: BudgetAlert, budget: Budget): Promise<void> {
    this.log("budget_alert_fired", {
      alertId: alert.id,
      budgetId: budget.id,
      severity: alert.severity,
      thresholdPct: alert.thresholdPct,
      utilizationPct: alert.currentUtilizationPct,
      spentUsdc: budget.spentUsdc,
      limitUsdc: budget.limitUsdc,
    });
  }
}

export interface AlertRepository {
  create(alert: BudgetAlert): Promise<BudgetAlert>;
  findByBudget(budgetId: string): Promise<ReadonlyArray<BudgetAlert>>;
  update(alert: BudgetAlert): Promise<BudgetAlert>;
}

export class InMemoryAlertRepository implements AlertRepository {
  private readonly store = new Map<string, BudgetAlert>();

  async create(alert: BudgetAlert): Promise<BudgetAlert> {
    this.store.set(alert.id, alert);
    return alert;
  }

  async findByBudget(budgetId: string): Promise<ReadonlyArray<BudgetAlert>> {
    return Array.from(this.store.values()).filter((a) => a.budgetId === budgetId);
  }

  async update(alert: BudgetAlert): Promise<BudgetAlert> {
    this.store.set(alert.id, alert);
    return alert;
  }
}
