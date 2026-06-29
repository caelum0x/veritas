// Dashboard controller: validates input, delegates to service, formats responses.
import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { DashboardsService } from "./dashboards.service.js";
import {
  CreateDashboardBodySchema,
  UpdateDashboardBodySchema,
  DashboardParamsSchema,
  DashboardListQuerySchema,
  DashboardDataQuerySchema,
} from "./dashboards.schema.js";
import {
  toDashboardResponse,
  toDashboardListResponse,
  toDashboardDataResponse,
} from "./dashboards.mapper.js";

export class DashboardsController {
  readonly #service: DashboardsService;

  constructor(service: DashboardsService) {
    this.#service = service;
  }

  listDashboards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = DashboardListQuerySchema.parse(req.query);
      const orgId = (query.orgId ?? req.principal?.orgId) as string | undefined;
      if (!orgId) {
        res.status(400).json({ success: false, error: { code: "VALIDATION", message: "orgId is required" } });
        return;
      }
      const { items, total } = this.#service.list(orgId, query.limit, query.offset);
      res.json({
        success: true,
        data: toDashboardListResponse(items, total, query.limit, query.offset),
      });
    } catch (e) {
      next(e);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = DashboardParamsSchema.parse(req.params);
      const result = this.#service.findById(id);
      if (!isOk(result)) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toDashboardResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  createDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = CreateDashboardBodySchema.parse(req.body);
      const orgId = (req.query["orgId"] ?? req.principal?.orgId) as string | undefined;
      if (!orgId) {
        res.status(400).json({ success: false, error: { code: "VALIDATION", message: "orgId is required" } });
        return;
      }
      const result = this.#service.create(orgId, body);
      if (!isOk(result)) {
        res.status(409).json({ success: false, error: { code: "CONFLICT", message: result.error.message } });
        return;
      }
      res.status(201).json({ success: true, data: toDashboardResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  updateDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = DashboardParamsSchema.parse(req.params);
      const body = UpdateDashboardBodySchema.parse(req.body);
      const result = this.#service.update(id, body);
      if (!isOk(result)) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toDashboardResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  archiveDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = DashboardParamsSchema.parse(req.params);
      const result = this.#service.archive(id);
      if (!isOk(result)) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toDashboardResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  deleteDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = DashboardParamsSchema.parse(req.params);
      const result = this.#service.delete(id);
      if (!isOk(result)) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
        return;
      }
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  };

  getDashboardData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = DashboardDataQuerySchema.parse(req.query);
      const result = await this.#service.getDashboardData(query);
      if (!isOk(result)) {
        const err = result.error;
        const status = (err as { code?: string }).code === "NOT_FOUND" ? 404 : 500;
        res.status(status).json({ success: false, error: { code: (err as { code?: string }).code, message: err.message } });
        return;
      }
      res.json({ success: true, data: toDashboardDataResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };
}
