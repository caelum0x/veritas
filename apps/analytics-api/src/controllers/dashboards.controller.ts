// CRUD controller for dashboards and their widgets via @veritas/dashboards.
import type { Request, Response } from "express";
import { z } from "zod";
import { isOk } from "@veritas/core";
import { CreateWidgetSchema } from "@veritas/dashboards";
import type { DashboardStore } from "../bootstrap.js";

const CreateDashboardSchema = z.object({
  orgId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["private", "org", "public"]).optional().default("private"),
  tags: z.array(z.string()).optional().default([]),
});

const UpdateDashboardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["private", "org", "public"]).optional(),
  tags: z.array(z.string()).optional(),
});

export interface DashboardsControllerDeps {
  readonly dashboardStore: DashboardStore;
}

const OrgIdQuerySchema = z.object({ orgId: z.string().min(1) });
const DashboardIdParamSchema = z.object({ id: z.string().min(1) });

export function makeDashboardsController(deps: DashboardsControllerDeps) {
  async function listDashboards(req: Request, res: Response): Promise<void> {
    const parsed = OrgIdQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const items = deps.dashboardStore.list(parsed.data.orgId);
    res.status(200).json({ success: true, data: items });
  }

  async function getDashboard(req: Request, res: Response): Promise<void> {
    const paramsParsed = DashboardIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const result = deps.dashboardStore.findById(paramsParsed.data.id);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  async function createDashboard(req: Request, res: Response): Promise<void> {
    const parsed = CreateDashboardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = deps.dashboardStore.create(parsed.data);
    if (!isOk(result)) {
      res.status(409).json({ success: false, error: { code: "CONFLICT", message: result.error.message } });
      return;
    }
    res.status(201).json({ success: true, data: result.value });
  }

  async function updateDashboard(req: Request, res: Response): Promise<void> {
    const paramsParsed = DashboardIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const bodyParsed = UpdateDashboardSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const result = deps.dashboardStore.update(paramsParsed.data.id, bodyParsed.data);
    if (!isOk(result)) {
      res.status(result.error.message.includes("conflict") ? 409 : 404).json({
        success: false,
        error: { code: "NOT_FOUND", message: result.error.message },
      });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  async function archiveDashboard(req: Request, res: Response): Promise<void> {
    const paramsParsed = DashboardIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const result = deps.dashboardStore.archive(paramsParsed.data.id);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(200).json({ success: true, data: result.value });
  }

  async function deleteDashboard(req: Request, res: Response): Promise<void> {
    const paramsParsed = DashboardIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const result = deps.dashboardStore.delete(paramsParsed.data.id);
    if (!isOk(result)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: result.error.message } });
      return;
    }
    res.status(204).end();
  }

  async function addWidget(req: Request, res: Response): Promise<void> {
    const paramsParsed = DashboardIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramsParsed.error.message } });
      return;
    }
    const bodyParsed = CreateWidgetSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const dashResult = deps.dashboardStore.findById(paramsParsed.data.id);
    if (!isOk(dashResult)) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: dashResult.error.message } });
      return;
    }
    res.status(201).json({
      success: true,
      data: { dashboardId: paramsParsed.data.id, widget: bodyParsed.data },
    });
  }

  return {
    listDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    archiveDashboard,
    deleteDashboard,
    addWidget,
  };
}
