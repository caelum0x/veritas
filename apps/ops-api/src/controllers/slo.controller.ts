// SLO controller: HTTP handlers for SLO CRUD, evaluations, and burn-rate alerts.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import {
  InMemorySloRepository,
  InMemorySloEvaluationRepository,
  type SloRepository,
  type SloEvaluationRepository,
  CreateSloSchema,
  makeSlo,
  updateSlo,
  SloNotFoundError,
} from "@veritas/slo";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";

export class SloController {
  constructor(
    private readonly sloRepo: SloRepository,
    private readonly evalRepo: SloEvaluationRepository,
  ) {}

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slos = await this.sloRepo.findAll();
      sendPage(res, slos, { total: slos.length, page: 1, limit: slos.length || 1 });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateSloSchema.parse(req.body);
      const slo = makeSlo(input, new Date().toISOString());
      const result = await this.sloRepo.save(slo);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, result.value);
    } catch (e) { next(e); }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.sloRepo.findById(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params["id"] ?? "";
      const existing = await this.sloRepo.findById(id);
      if (isErr(existing)) { next(existing.error); return; }
      const patch = CreateSloSchema.partial().parse(req.body);
      const updated = updateSlo(existing.value, patch, new Date().toISOString());
      const result = await this.sloRepo.save(updated);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.sloRepo.delete(req.params["id"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendNoContent(res);
    } catch (e) { next(e); }
  }

  async listEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query["limit"] ? Number(req.query["limit"]) : 50;
      const results = await this.evalRepo.findBySloId(req.params["id"] ?? "", limit);
      sendPage(res, results, { total: results.length, page: 1, limit });
    } catch (e) { next(e); }
  }

  async getEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.evalRepo.findById(req.params["evalId"] ?? "");
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }
}
