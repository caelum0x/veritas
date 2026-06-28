// Apps controller — validates requests, calls AppsService, maps results to HTTP responses
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { PortalAuthRequest } from "../../middleware/auth.js";
import type { AppsService } from "./apps.service.js";
import {
  CreateAppBodySchema,
  UpdateAppBodySchema,
  AppIdParamSchema,
} from "./apps.schema.js";
import { toAppDto, toAppDtoList } from "./apps.mapper.js";

export class AppsController {
  constructor(private readonly service: AppsService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authReq = req as PortalAuthRequest;
    const orgId = authReq.orgId ?? (req.query["organizationId"] as string | undefined) ?? "";
    if (!orgId) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "organizationId is required" } });
      return;
    }
    const result = await this.service.listApps(orgId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDtoList(result.value) });
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authReq = req as PortalAuthRequest;
    const body = {
      ...(req.body as Record<string, unknown>),
      organizationId: (req.body as Record<string, unknown>)["organizationId"] ?? authReq.orgId ?? "",
      ownerId: (req.body as Record<string, unknown>)["ownerId"] ?? authReq.userId ?? "",
    };
    const parsed = CreateAppBodySchema.safeParse(body);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.createApp(parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: toAppDto(result.value) });
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = AppIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.getApp(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDto(result.value) });
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    const paramParsed = AppIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: paramParsed.error.message } });
      return;
    }
    const bodyParsed = UpdateAppBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: bodyParsed.error.message } });
      return;
    }
    const result = await this.service.updateApp(paramParsed.data.id, bodyParsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDto(result.value) });
  }

  async suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = AppIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.suspendApp(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDto(result.value) });
  }

  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = AppIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.activateApp(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDto(result.value) });
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = AppIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.deleteApp(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toAppDto(result.value) });
  }
}
