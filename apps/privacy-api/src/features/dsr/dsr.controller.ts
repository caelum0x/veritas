// DSR controller: validates request bodies, delegates to DsrService, maps to HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { DsrService } from "./dsr.service.js";
import {
  CreateDsrBodySchema,
  UpdateDsrStatusBodySchema,
  InitiateVerificationBodySchema,
  FulfillDsrBodySchema,
  RunErasureBodySchema,
  ListDsrQuerySchema,
  DsrIdParamSchema,
} from "./dsr.schema.js";
import { toDsrResponse, toWorkflowResponse } from "./dsr.mapper.js";

export class DsrController {
  constructor(private readonly service: DsrService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateDsrBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.createDsr(parsed.data);
      if (!isOk(result)) { next(result.error); return; }
      res.status(201).json({ success: true, data: toDsrResponse(result.value) });
    } catch (e) { next(e); }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = DsrIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: params.error.issues } });
        return;
      }
      const result = await this.service.getDsr(params.data.id);
      if (!isOk(result)) {
        const e = result.error as { statusCode?: number; code?: string; message?: string };
        res.status(e.statusCode ?? 404).json({ success: false, error: { code: e.code ?? "NOT_FOUND", message: (result.error as Error).message } });
        return;
      }
      res.json({ success: true, data: toDsrResponse(result.value) });
    } catch (e) { next(e); }
  }

  async listBySubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListDsrQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "subjectId query param required" } });
        return;
      }
      const dsrs = await this.service.listDsrsBySubject(query.data.subjectId);
      res.json({ success: true, data: dsrs.map(toDsrResponse) });
    } catch (e) { next(e); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = DsrIdParamSchema.safeParse(req.params);
      const body = UpdateDsrStatusBodySchema.safeParse(req.body);
      if (!params.success || !body.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR" } });
        return;
      }
      const result = await this.service.updateDsrStatus(params.data.id, body.data);
      if (!isOk(result)) {
        const e = result.error as { statusCode?: number; code?: string };
        res.status(e.statusCode ?? 422).json({ success: false, error: { code: e.code ?? "UPDATE_FAILED", message: (result.error as Error).message } });
        return;
      }
      res.json({ success: true, data: toDsrResponse(result.value) });
    } catch (e) { next(e); }
  }

  async initiateVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = InitiateVerificationBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.initiateVerification(parsed.data.subjectEmail, parsed.data.method);
      if (!isOk(result)) { next(result.error); return; }
      res.status(202).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async fulfill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = FulfillDsrBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const { tokenId, otp, ...createBody } = parsed.data;
      const result = await this.service.fulfillDsr(tokenId, otp, createBody);
      if (!isOk(result)) { next(result.error); return; }
      res.status(202).json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async runErasure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RunErasureBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } });
        return;
      }
      const result = await this.service.runErasure(parsed.data.dsrId, parsed.data.categories);
      if (!isOk(result)) {
        const e = result.error as { statusCode?: number; code?: string };
        res.status(e.statusCode ?? 422).json({ success: false, error: { code: e.code ?? "ERASURE_FAILED", message: (result.error as Error).message } });
        return;
      }
      res.json({ success: true, data: result.value });
    } catch (e) { next(e); }
  }

  async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = DsrIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR" } });
        return;
      }
      const state = await this.service.getWorkflowState(params.data.id);
      if (!state) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: `No workflow for DSR ${params.data.id}` } });
        return;
      }
      res.json({ success: true, data: toWorkflowResponse(state) });
    } catch (e) { next(e); }
  }
}
