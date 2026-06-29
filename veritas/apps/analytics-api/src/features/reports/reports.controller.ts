// Reports controller: validates requests, delegates to ReportsService, sends HTTP responses.
import type { Request, Response } from "express";
import { isOk } from "@veritas/core";
import type { CreateReportInput } from "@veritas/reporting";
import {
  ListReportsQuerySchema,
  ReportIdParamSchema,
  UpdateReportBodySchema,
  GenerateReportBodySchema,
  AnalyticsQueryBodySchema,
  CreateReportInputSchema,
} from "./reports.schema.js";
import {
  toReportResponse,
  toReportListResponse,
  toTemplateResponse,
} from "./reports.mapper.js";
import type { ReportsService } from "./reports.service.js";

export interface ReportsControllerDeps {
  readonly reportsService: ReportsService;
}

export function makeReportsController(deps: ReportsControllerDeps) {
  const { reportsService } = deps;

  async function listReports(req: Request, res: Response): Promise<void> {
    const parsed = ListReportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.listReports(parsed.data);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, ...toReportListResponse(result.value) });
  }

  async function getReport(req: Request, res: Response): Promise<void> {
    const parsed = ReportIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.getReport(parsed.data.id);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: toReportResponse(result.value) });
  }

  async function createReport(req: Request, res: Response): Promise<void> {
    const parsed = CreateReportInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.createReport(parsed.data as unknown as CreateReportInput);
    if (!isOk(result)) {
      const status = result.error.message.includes("already exists") ? 409 : 500;
      res.status(status).json({ success: false, error: { code: "CONFLICT", message: result.error.message } });
      return;
    }
    res.status(201).json({ success: true, data: toReportResponse(result.value) });
  }

  async function updateReport(req: Request, res: Response): Promise<void> {
    const paramsParsed = ReportIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const bodyParsed = UpdateReportBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const result = await reportsService.updateReport(paramsParsed.data.id, bodyParsed.data as unknown as Partial<Omit<CreateReportInput, "id" | "createdAt">>);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: toReportResponse(result.value) });
  }

  async function deleteReport(req: Request, res: Response): Promise<void> {
    const parsed = ReportIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.deleteReport(parsed.data.id);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(204).end();
  }

  async function listTemplates(req: Request, res: Response): Promise<void> {
    const orgId = req.query["organizationId"];
    if (typeof orgId !== "string" || orgId.length === 0) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "organizationId is required" } });
      return;
    }
    const result = await reportsService.listTemplates(orgId);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value.map(toTemplateResponse) });
  }

  async function generateReport(req: Request, res: Response): Promise<void> {
    const parsed = GenerateReportBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.generateReport(parsed.data);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    res.status(202).json({ success: true, data: result.value });
  }

  async function queryAnalytics(req: Request, res: Response): Promise<void> {
    const parsed = AnalyticsQueryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await reportsService.queryAnalytics(parsed.data);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  return { listReports, getReport, createReport, updateReport, deleteReport, listTemplates, generateReport, queryAnalytics };
}
