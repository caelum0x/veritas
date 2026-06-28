// DSR controller: handles CRUD and status transitions for data subject requests.

import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import { type DsrStore } from "@veritas/gdpr";
import { CreateDsrRequestSchema, DsrStatusSchema, type DsrStatus } from "@veritas/gdpr";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: DsrStatusSchema,
  rejectionReason: z.string().optional(),
});

export class DsrController {
  constructor(private readonly store: DsrStore) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateDsrRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body", issues: parsed.error.issues } });
        return;
      }
      const dsr = await this.store.createDsr(parsed.data);
      res.status(201).json({ success: true, data: dsr });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const result = await this.store.getDsr(id);
      if (!isOk(result)) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `DSR ${id} not found` } });
        return;
      }
      res.json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  }

  async listBySubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.query["subjectId"];
      if (typeof subjectId !== "string" || subjectId.length === 0) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "subjectId query param required" } });
        return;
      }
      const dsrs = await this.store.listDsrsBySubject(subjectId);
      res.json({ success: true, data: dsrs });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const parsed = UpdateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status update", issues: parsed.error.issues } });
        return;
      }
      const { status, rejectionReason } = parsed.data;
      const result = await this.store.updateDsrStatus(id, status as DsrStatus, rejectionReason ? { rejectionReason } : undefined);
      if (!isOk(result)) {
        const code = (result.error as { code?: string }).code ?? "UPDATE_FAILED";
        const statusCode = (result.error as { statusCode?: number }).statusCode ?? 422;
        res.status(statusCode).json({ success: false, error: { code, message: (result.error as Error).message } });
        return;
      }
      res.json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  }

  async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const state = await this.store.getWorkflowState(id);
      if (!state) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `Workflow for DSR ${id} not found` } });
        return;
      }
      res.json({ success: true, data: state });
    } catch (err) {
      next(err);
    }
  }
}
