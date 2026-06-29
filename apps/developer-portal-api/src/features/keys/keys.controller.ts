// Keys controller — validates requests, calls KeysService, maps results to HTTP responses
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { PortalAuthRequest } from "../../middleware/auth.js";
import type { KeysService } from "./keys.service.js";
import { CreateKeyBodySchema, KeyIdParamSchema, ListKeysQuerySchema } from "./keys.schema.js";
import { toKeyDto, toKeyDtoList, toKeyWithSecretDto } from "./keys.mapper.js";

export class KeysController {
  constructor(private readonly service: KeysService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    const queryParsed = ListKeysQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: queryParsed.error.message } });
      return;
    }
    const authReq = req as PortalAuthRequest;
    const result = await this.service.listKeys(queryParsed.data, authReq.portalAppId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toKeyDtoList(result.value) });
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authReq = req as PortalAuthRequest;
    const rawBody = {
      ...(req.body as Record<string, unknown>),
      appId: (req.body as Record<string, unknown>)["appId"] ?? authReq.portalAppId ?? "",
      organizationId: (req.body as Record<string, unknown>)["organizationId"] ?? authReq.orgId ?? "",
    };
    const parsed = CreateKeyBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.createKey(parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: toKeyWithSecretDto(result.value) });
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = KeyIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.getKey(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toKeyDto(result.value) });
  }

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = KeyIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
      return;
    }
    const result = await this.service.revokeKey(parsed.data.id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: toKeyDto(result.value) });
  }
}
