// Cost controller — validates requests with zod, delegates to CostFeatureService, maps to HTTP.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  ListEventsQuerySchema,
  CreateEventBodySchema,
  CreateBudgetBodySchema,
  ListBudgetsQuerySchema,
  CreateBudgetAlertBodySchema,
  AggregateQuerySchema,
  BuildReportBodySchema,
  ListAllocationsQuerySchema,
  ListReportsQuerySchema,
  ListForecastsQuerySchema,
} from "./cost.schema.js";
import {
  toCostEventResponse,
  toBudgetResponse,
  toBudgetAlertResponse,
  toCostAllocationResponse,
  toCostSummaryResponse,
  toCostReportResponse,
  toCostForecastResponse,
} from "./cost.mapper.js";
import type { CostFeatureService } from "./cost.service.js";
import { sendOk, sendCreated, sendPage } from "../../http/responder.js";

export class CostController {
  constructor(private readonly service: CostFeatureService) {}

  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListEventsQuerySchema.parse(req.query);
      const result = await this.service.listEvents(query);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value.map(toCostEventResponse), {
        total: result.value.length,
        page: 1,
        limit: query.limit,
      });
    } catch (e) { next(e); }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateEventBodySchema.parse(req.body);
      const result = await this.service.createEvent(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toCostEventResponse(result.value));
    } catch (e) { next(e); }
  }

  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getEvent(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toCostEventResponse(result.value));
    } catch (e) { next(e); }
  }

  async listBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListBudgetsQuerySchema.parse(req.query);
      const result = await this.service.listBudgets(query.tenantId);
      if (isErr(result)) { next(result.error); return; }
      const budgets = query.activeOnly ? result.value.filter((b) => b.active) : result.value;
      sendPage(res, budgets.map(toBudgetResponse), {
        total: budgets.length,
        page: 1,
        limit: budgets.length || 100,
      });
    } catch (e) { next(e); }
  }

  async createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateBudgetBodySchema.parse(req.body);
      const result = await this.service.createBudget(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toBudgetResponse(result.value));
    } catch (e) { next(e); }
  }

  async getBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getBudget(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toBudgetResponse(result.value));
    } catch (e) { next(e); }
  }

  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const budgetId = typeof req.query["budgetId"] === "string" ? req.query["budgetId"] : undefined;
      const result = await this.service.listAlerts(budgetId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value.map(toBudgetAlertResponse), {
        total: result.value.length,
        page: 1,
        limit: result.value.length || 100,
      });
    } catch (e) { next(e); }
  }

  async createBudgetAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateBudgetAlertBodySchema.parse(req.body);
      const result = await this.service.createBudgetAlert(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toBudgetAlertResponse(result.value));
    } catch (e) { next(e); }
  }

  async listAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListAllocationsQuerySchema.parse(req.query);
      const result = await this.service.listAllocations(query);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value.map(toCostAllocationResponse), {
        total: result.value.length,
        page: 1,
        limit: query.limit,
      });
    } catch (e) { next(e); }
  }

  async aggregate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = AggregateQuerySchema.parse(req.query);
      const result = await this.service.aggregate(query);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value.map(toCostSummaryResponse));
    } catch (e) { next(e); }
  }

  async buildReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = BuildReportBodySchema.parse(req.body);
      const result = await this.service.buildReport(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toCostReportResponse(result.value));
    } catch (e) { next(e); }
  }

  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListReportsQuerySchema.parse(req.query);
      const result = await this.service.listReports(query.tenantId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value.map(toCostReportResponse), {
        total: result.value.length,
        page: 1,
        limit: result.value.length || 100,
      });
    } catch (e) { next(e); }
  }

  async listForecasts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListForecastsQuerySchema.parse(req.query);
      const result = await this.service.listForecasts(query.tenantId);
      if (isErr(result)) { next(result.error); return; }
      sendPage(res, result.value.map(toCostForecastResponse), {
        total: result.value.length,
        page: 1,
        limit: result.value.length || 100,
      });
    } catch (e) { next(e); }
  }
}
