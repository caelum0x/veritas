// Tenant controller: validates requests, calls TenantsService, sends HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { buildContext } from "../../context.js";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../../http/responder.js";
import { HttpError } from "../../http/api-error.js";
import type { TenantsService } from "./tenants.service.js";
import {
  CreateTenantBodySchema,
  UpdateTenantBodySchema,
  TenantParamsSchema,
  ListTenantsQuerySchema,
  TransferOwnershipBodySchema,
} from "./tenants.schema.js";
import { toTenantResponse, toTenantListResponse } from "./tenants.mapper.js";

export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateTenantBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.create(ctx, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendCreated(res, toTenantResponse(result.value));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = TenantParamsSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await this.service.getById(ctx, orgId);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toTenantResponse(result.value));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = TenantParamsSchema.parse(req.params);
      const body = UpdateTenantBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.update(ctx, orgId, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toTenantResponse(result.value));
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListTenantsQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await this.service.list(ctx, query);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      const mapped = toTenantListResponse(result.value as never);
      sendPage(res, mapped.items, {
        total: mapped.total,
        nextCursor: mapped.nextCursor ?? null,
        hasMore: mapped.nextCursor != null,
      });
    } catch (err) { next(err); }
  }

  async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = TenantParamsSchema.parse(req.params);
      const { newOwnerId } = TransferOwnershipBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.transferOwnership(ctx, orgId, newOwnerId);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toTenantResponse(result.value));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orgId } = TenantParamsSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await this.service.delete(ctx, orgId);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendNoContent(res);
    } catch (err) { next(err); }
  }
}
