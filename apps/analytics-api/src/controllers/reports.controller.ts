// CRUD and generation controller for analytical reports via @veritas/reporting.
import type { Request, Response } from "express";
import { z } from "zod";
import { isOk } from "@veritas/core";
import {
  type ReportStore,
  type ReportTemplateStore,
  type CreateReportInput,
  type Report,
  CreateReportInputSchema,
  ReportStatusSchema,
  ReportFormatSchema,
} from "@veritas/reporting";

export interface ReportsControllerDeps {
  readonly reportStore: ReportStore;
  readonly templateStore: ReportTemplateStore;
}

const ListQuerySchema = z.object({
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
  status: ReportStatusSchema.optional(),
  format: ReportFormatSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const ReportIdParamSchema = z.object({ id: z.string().min(1) });

export function makeReportsController(deps: ReportsControllerDeps) {
  async function listReports(req: Request, res: Response): Promise<void> {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await deps.reportStore.list(parsed.data);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    const { items, total, page, pageSize } = result.value;
    res.status(200).json({ success: true, data: items, meta: { total, page, pageSize } });
  }

  async function getReport(req: Request, res: Response): Promise<void> {
    const paramsParsed = ReportIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const result = await deps.reportStore.get(paramsParsed.data.id as never);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  async function createReport(req: Request, res: Response): Promise<void> {
    const parsed = CreateReportInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await deps.reportStore.create(parsed.data as unknown as CreateReportInput);
    if (!isOk(result)) {
      const status = result.error.message.includes("already exists") ? 409 : 500;
      res.status(status).json({ success: false, error: { code: "CONFLICT", message: result.error.message } });
      return;
    }
    res.status(201).json({ success: true, data: result.value });
  }

  async function updateReport(req: Request, res: Response): Promise<void> {
    const paramsParsed = ReportIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const patchSchema = CreateReportInputSchema.partial();
    const bodyParsed = patchSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const result = await deps.reportStore.update(paramsParsed.data.id as never, bodyParsed.data as unknown as Partial<Omit<Report, "id" | "createdAt">>);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  async function deleteReport(req: Request, res: Response): Promise<void> {
    const paramsParsed = ReportIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const result = await deps.reportStore.remove(paramsParsed.data.id as never);
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
    const result = await deps.templateStore.list(orgId);
    if (!isOk(result)) {
      res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  return { listReports, getReport, createReport, updateReport, deleteReport, listTemplates };
}
