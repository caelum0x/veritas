// Admin controller handling CRUD operations for tenant management.
import type { Request, Response, NextFunction } from "express";
import { makeTenant, withStatus, InMemoryTenantStore } from "@veritas/tenancy";
import type { TenantStore, Tenant, TenantId } from "@veritas/tenancy";
import { brand } from "@veritas/core";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import type {
  CreateTenantBody,
  UpdateTenantBody,
  TenantIdParam,
  ListTenantsQuery,
} from "../validators/tenant.validator.js";
import {
  CreateTenantBodySchema,
  UpdateTenantBodySchema,
  TenantIdParamSchema,
  ListTenantsQuerySchema,
} from "../validators/tenant.validator.js";

// Shared in-process store — in production, inject a real persistence-backed store.
const store: TenantStore = new InMemoryTenantStore();

function asTenantId(raw: string): TenantId {
  return brand<string, "TenantId">(raw) as TenantId;
}

export async function listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = ListTenantsQuerySchema.parse(req.query) as ListTenantsQuery;
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    let tenants = await store.list(limit + 1, offset);

    if (query.organizationId !== undefined) {
      tenants = tenants.filter((t) => t.organizationId === query.organizationId);
    }
    if (query.status !== undefined) {
      tenants = tenants.filter((t) => t.status === query.status);
    }

    const hasNextPage = tenants.length > limit;
    const items = hasNextPage ? tenants.slice(0, limit) : tenants;
    const meta = { total: items.length + offset, nextCursor: null as string | null, hasMore: hasNextPage };

    sendPage(res, items, meta);
  } catch (err) {
    next(err);
  }
}

export async function getTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = TenantIdParamSchema.parse(req.params) as TenantIdParam;
    const tenant = await store.findById(asTenantId(id));
    if (tenant === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Tenant '${id}' not found`);
    }
    sendOk(res, tenant);
  } catch (err) {
    next(err);
  }
}

export async function createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateTenantBodySchema.parse(req.body) as CreateTenantBody;

    const existing = await store.findBySlug(body.slug);
    if (existing !== undefined) {
      throw new HttpError(409, "CONFLICT", `Tenant slug '${body.slug}' is already taken`);
    }

    const tenant = makeTenant({
      slug: body.slug,
      displayName: body.displayName,
      organizationId: body.organizationId,
      planId: body.planId,
      metadata: body.metadata,
    });

    const saved = await store.save(tenant);
    sendCreated(res, saved);
  } catch (err) {
    next(err);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = TenantIdParamSchema.parse(req.params) as TenantIdParam;
    const body = UpdateTenantBodySchema.parse(req.body) as UpdateTenantBody;

    const tenant = await store.findById(asTenantId(id));
    if (tenant === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Tenant '${id}' not found`);
    }

    const now = new Date().toISOString();
    const updated: Tenant = {
      ...tenant,
      displayName: body.displayName ?? tenant.displayName,
      planId: body.planId ?? tenant.planId,
      status: body.status ?? tenant.status,
      metadata: body.metadata !== undefined ? { ...tenant.metadata, ...body.metadata } : tenant.metadata,
      updatedAt: now,
    };

    const saved = await store.save(updated);
    sendOk(res, saved);
  } catch (err) {
    next(err);
  }
}

export async function suspendTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = TenantIdParamSchema.parse(req.params) as TenantIdParam;

    const tenant = await store.findById(asTenantId(id));
    if (tenant === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Tenant '${id}' not found`);
    }

    const suspended = withStatus(tenant, "suspended");
    const saved = await store.save(suspended);
    sendOk(res, saved);
  } catch (err) {
    next(err);
  }
}

export async function activateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = TenantIdParamSchema.parse(req.params) as TenantIdParam;

    const tenant = await store.findById(asTenantId(id));
    if (tenant === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Tenant '${id}' not found`);
    }

    const activated = withStatus(tenant, "active");
    const saved = await store.save(activated);
    sendOk(res, saved);
  } catch (err) {
    next(err);
  }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = TenantIdParamSchema.parse(req.params) as TenantIdParam;

    const tenant = await store.findById(asTenantId(id));
    if (tenant === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Tenant '${id}' not found`);
    }

    await store.delete(asTenantId(id));
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
