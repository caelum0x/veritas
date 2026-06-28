// SLO controller — validates requests with zod, calls SloFeatureService, maps to HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreateSloBodySchema,
  UpdateSloBodySchema,
  ListEvaluationsQuerySchema,
  EvaluateSloBodySchema,
  ListReportsQuerySchema,
} from "./slo.schema.js";
import {
  toSloResponse,
  toSloEvaluationResponse,
  toBurnAlertResponse,
  toSloReportResponse,
} from "./slo.mapper.js";
import type { SloFeatureService } from "./slo.service.js";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../../http/responder.js";

export class SloController {
  constructor(private readonly service: SloFeatureService) {}

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slos = await this.service.list();
      sendPage(res, slos.map(toSloResponse), {
        total: slos.length,
        page: 1,
        limit: Math.max(slos.length, 1),
      });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateSloBodySchema.parse(req.body);
      const result = await this.service.create(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toSloResponse(result.value));
    } catch (e) { next(e); }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.get(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toSloResponse(result.value));
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = UpdateSloBodySchema.parse(req.body);
      const result = await this.service.update(req.params["id"] ?? "", body);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toSloResponse(result.value));
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.remove(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendNoContent(res);
    } catch (e) { next(e); }
  }

  async evaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = EvaluateSloBodySchema.parse(req.body);
      const result = await this.service.evaluate(req.params["id"] ?? "", body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toSloEvaluationResponse(result.value));
    } catch (e) { next(e); }
  }

  async listEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = ListEvaluationsQuerySchema.parse(req.query);
      const evals = await this.service.listEvaluations(req.params["id"] ?? "", limit);
      sendPage(res, evals.map(toSloEvaluationResponse), {
        total: evals.length,
        page: 1,
        limit,
      });
    } catch (e) { next(e); }
  }

  async getEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getEvaluation(req.params["evalId"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toSloEvaluationResponse(result.value));
    } catch (e) { next(e); }
  }

  async listBurnAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = ListEvaluationsQuerySchema.parse(req.query);
      const alerts = await this.service.listBurnAlerts(req.params["id"] ?? "", limit);
      sendPage(res, alerts.map(toBurnAlertResponse), {
        total: alerts.length,
        page: 1,
        limit,
      });
    } catch (e) { next(e); }
  }

  async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.generateReport(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toSloReportResponse(result.value));
    } catch (e) { next(e); }
  }

  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = ListReportsQuerySchema.parse(req.query);
      const reports = await this.service.listReports(req.params["id"] ?? "", limit);
      sendPage(res, reports.map(toSloReportResponse), {
        total: reports.length,
        page: 1,
        limit,
      });
    } catch (e) { next(e); }
  }

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.getReport(req.params["reportId"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, toSloReportResponse(result.value));
    } catch (e) { next(e); }
  }
}
