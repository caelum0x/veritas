// Budget: defines spending limits per tenant/feature over a time period
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";

export const BudgetScopeSchema = z.enum(["tenant", "feature", "tenant_feature"]);
export type BudgetScope = z.infer<typeof BudgetScopeSchema>;

export const BudgetPeriodSchema = z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "custom"]);
export type BudgetPeriod = z.infer<typeof BudgetPeriodSchema>;

export const BudgetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  scope: BudgetScopeSchema,
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  limitUsdc: z.number().positive(),
  period: BudgetPeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  spentUsdc: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Budget = z.infer<typeof BudgetSchema>;

export interface CreateBudgetInput {
  readonly name: string;
  readonly scope: BudgetScope;
  readonly tenantId?: string;
  readonly featureId?: string;
  readonly limitUsdc: number;
  readonly period: BudgetPeriod;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export function makeBudget(input: CreateBudgetInput): Budget {
  const now = epochToIso(Date.now());
  return BudgetSchema.parse({
    id: newId("budget"),
    ...input,
    spentUsdc: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

export function applySpend(budget: Budget, amountUsdc: number): Budget {
  return BudgetSchema.parse({
    ...budget,
    spentUsdc: budget.spentUsdc + amountUsdc,
    updatedAt: epochToIso(Date.now()),
  });
}

export function remainingBudget(budget: Budget): number {
  return Math.max(0, budget.limitUsdc - budget.spentUsdc);
}

export function utilizationRate(budget: Budget): number {
  if (budget.limitUsdc === 0) return 1;
  return budget.spentUsdc / budget.limitUsdc;
}

export interface BudgetStatus {
  readonly budgetId: string;
  readonly tenantId: string | undefined;
  readonly feature: string | undefined;
  readonly limitUsdc: number;
  readonly spentUsdc: number;
  readonly remainingUsdc: number;
  readonly utilizationPct: number;
  readonly exceeded: boolean;
}

export function toBudgetStatus(budget: Budget): BudgetStatus {
  const remaining = remainingBudget(budget);
  const utilRate = utilizationRate(budget);
  return {
    budgetId: budget.id,
    tenantId: budget.tenantId,
    feature: budget.featureId,
    limitUsdc: budget.limitUsdc,
    spentUsdc: budget.spentUsdc,
    remainingUsdc: remaining,
    utilizationPct: utilRate * 100,
    exceeded: budget.spentUsdc > budget.limitUsdc,
  };
}

export interface BudgetRepository {
  create(budget: Budget): Promise<Budget>;
  findById(id: string): Promise<Budget | undefined>;
  findActive(tenantId?: string, featureId?: string): Promise<ReadonlyArray<Budget>>;
  update(budget: Budget): Promise<Budget>;
  deactivate(id: string): Promise<Budget | undefined>;
}

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly store = new Map<string, Budget>();

  async create(budget: Budget): Promise<Budget> {
    this.store.set(budget.id, budget);
    return budget;
  }

  async findById(id: string): Promise<Budget | undefined> {
    return this.store.get(id);
  }

  async findActive(tenantId?: string, featureId?: string): Promise<ReadonlyArray<Budget>> {
    return Array.from(this.store.values()).filter((b) => {
      if (!b.active) return false;
      if (tenantId !== undefined && b.tenantId !== tenantId) return false;
      if (featureId !== undefined && b.featureId !== featureId) return false;
      return true;
    });
  }

  async update(budget: Budget): Promise<Budget> {
    this.store.set(budget.id, budget);
    return budget;
  }

  async deactivate(id: string): Promise<Budget | undefined> {
    const budget = this.store.get(id);
    if (!budget) return undefined;
    const updated: Budget = BudgetSchema.parse({
      ...budget,
      active: false,
      updatedAt: epochToIso(Date.now()),
    });
    this.store.set(id, updated);
    return updated;
  }
}
