// Cost controller: handles HTTP request/response for cost events, budgets, allocations, and reports.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import {
  CostStore,
  CostQuerySchema,
  makeBudget,
  BudgetSchema,
  makeCostEvent,
  CostEventKindSchema,
} from "@veritas/cost";
import { sendOk, sendCreated, sendPage } from "../http/responder.js";

const CreateBudgetBodySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(["tenant", "feature", "tenant_feature"]),
  tenantId: z.string().optional(),
  featureId: z.string().optional(),
  limitUsdc: z.number().positive(),
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "annual", "custom"]),
  periodStart: z.string(),
  periodEnd: z.string(),
});

const CreateEventBodySchema = z.object({
  tenantId: z.string().min(1),
  featureId: z.string().optional(),
  feature: z.string().optional(),
  category: z.string().min(1),
  kind: CostEventKindSchema,
  amountUsdc: z.number().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export class CostController {
  constructor(private readonly store: CostStore) {}

  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = CostQuerySchema.parse({
        ...req.query,
        limit: req.query["limit"] ? Number(req.query["limit"]) : undefined,
      });
      const result = await this.store.listEvents(query);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, {
        total: result.value.length,
        page: 1,
        limit: query.limit,
      });
    } catch (e) { next(e); }
  }

  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.store.getEvent(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateEventBodySchema.parse(req.body);
      const event = makeCostEvent({
        tenantId: body.tenantId,
        featureId: body.featureId ?? body.feature ?? "unknown",
        kind: body.kind,
        amountUsdc: body.amountUsdc,
        metadata: body.metadata ?? {},
      });
      const result = await this.store.saveEvent(event);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async listBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = typeof req.query["tenantId"] === "string" ? req.query["tenantId"] : undefined;
      const result = await this.store.listBudgets(tenantId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, { total: result.value.length, page: 1, limit: result.value.length || 100 });
    } catch (e) { next(e); }
  }

  async getBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.store.getBudget(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateBudgetBodySchema.parse(req.body);
      const budget = makeBudget(body);
      const result = await this.store.saveBudget(budget);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async listAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = CostQuerySchema.parse({
        ...req.query,
        limit: req.query["limit"] ? Number(req.query["limit"]) : undefined,
      });
      const result = await this.store.listAllocations(query);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, { total: result.value.length, page: 1, limit: query.limit });
    } catch (e) { next(e); }
  }

  async getAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.store.getAllocation(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = typeof req.query["tenantId"] === "string" ? req.query["tenantId"] : undefined;
      const result = await this.store.listReports(tenantId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, { total: result.value.length, page: 1, limit: result.value.length || 100 });
    } catch (e) { next(e); }
  }

  async listForecasts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = typeof req.query["tenantId"] === "string" ? req.query["tenantId"] : undefined;
      const result = await this.store.listForecasts(tenantId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, { total: result.value.length, page: 1, limit: result.value.length || 100 });
    } catch (e) { next(e); }
  }

  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const budgetId = typeof req.query["budgetId"] === "string" ? req.query["budgetId"] : undefined;
      const result = await this.store.listAlerts(budgetId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value, { total: result.value.length, page: 1, limit: result.value.length || 100 });
    } catch (e) { next(e); }
  }
}
