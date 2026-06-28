// Admin controller for feature-flag CRUD and enable/disable lifecycle actions.
import type { Request, Response, NextFunction } from "express";
import { newId } from "@veritas/core";
import { sendOk, sendCreated, sendNoContent, sendPage } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import {
  listFeatureFlagsSchema,
  getFeatureFlagSchema,
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  featureFlagIdParamSchema,
} from "../validators/feature-flag.validator.js";
import type {
  ListFeatureFlagsInput,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
} from "../validators/feature-flag.validator.js";

// In-memory store shape for feature flags
interface FeatureFlag {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly enabled: boolean;
  readonly tenantId: string | undefined;
  readonly organizationId: string | undefined;
  readonly rolloutPercentage: number;
  readonly conditions: Record<string, unknown> | undefined;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Shared in-process store — swap for a persistence-backed store in production.
const flagStore = new Map<string, FeatureFlag>();

function findAll(filters: ListFeatureFlagsInput): readonly FeatureFlag[] {
  let flags = Array.from(flagStore.values());
  if (filters.tenantId !== undefined) {
    flags = flags.filter((f) => f.tenantId === filters.tenantId);
  }
  if (filters.organizationId !== undefined) {
    flags = flags.filter((f) => f.organizationId === filters.organizationId);
  }
  if (filters.enabled !== undefined) {
    flags = flags.filter((f) => f.enabled === filters.enabled);
  }
  return flags;
}

export async function listFeatureFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listFeatureFlagsSchema.parse(req.query) as ListFeatureFlagsInput;
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const all = findAll(query);
    const paginated = all.slice(offset, offset + limit);
    const hasMore = offset + limit < all.length;
    const meta = { total: all.length, nextCursor: null as string | null, hasMore };

    sendPage(res, paginated, meta);
  } catch (err) {
    next(err);
  }
}

export async function getFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = getFeatureFlagSchema.parse(req.params);
    const flag = flagStore.get(id);
    if (flag === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Feature flag '${id}' not found`);
    }
    sendOk(res, flag);
  } catch (err) {
    next(err);
  }
}

export async function createFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createFeatureFlagSchema.parse(req.body) as CreateFeatureFlagInput;

    const existing = Array.from(flagStore.values()).find((f) => f.key === body.key);
    if (existing !== undefined) {
      throw new HttpError(409, "CONFLICT", `Feature flag key '${body.key}' already exists`);
    }

    const now = new Date().toISOString();
    const flag: FeatureFlag = {
      id: newId("flag"),
      key: body.key,
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      tenantId: body.tenantId,
      organizationId: body.organizationId,
      rolloutPercentage: body.rolloutPercentage,
      conditions: body.conditions,
      metadata: body.metadata,
      createdAt: now,
      updatedAt: now,
    };

    flagStore.set(flag.id, flag);
    sendCreated(res, flag);
  } catch (err) {
    next(err);
  }
}

export async function updateFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = featureFlagIdParamSchema.parse(req.params);
    const body = updateFeatureFlagSchema.parse(req.body) as UpdateFeatureFlagInput;

    const flag = flagStore.get(id);
    if (flag === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Feature flag '${id}' not found`);
    }

    const updated: FeatureFlag = {
      ...flag,
      name: body.name ?? flag.name,
      description: body.description ?? flag.description,
      enabled: body.enabled ?? flag.enabled,
      rolloutPercentage: body.rolloutPercentage ?? flag.rolloutPercentage,
      conditions: body.conditions !== undefined ? { ...flag.conditions, ...body.conditions } : flag.conditions,
      metadata: body.metadata !== undefined ? { ...flag.metadata, ...body.metadata } : flag.metadata,
      updatedAt: new Date().toISOString(),
    };

    flagStore.set(id, updated);
    sendOk(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function enableFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = featureFlagIdParamSchema.parse(req.params);
    const flag = flagStore.get(id);
    if (flag === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Feature flag '${id}' not found`);
    }

    const updated: FeatureFlag = { ...flag, enabled: true, updatedAt: new Date().toISOString() };
    flagStore.set(id, updated);
    sendOk(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function disableFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = featureFlagIdParamSchema.parse(req.params);
    const flag = flagStore.get(id);
    if (flag === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Feature flag '${id}' not found`);
    }

    const updated: FeatureFlag = { ...flag, enabled: false, updatedAt: new Date().toISOString() };
    flagStore.set(id, updated);
    sendOk(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = featureFlagIdParamSchema.parse(req.params);
    if (!flagStore.has(id)) {
      throw new HttpError(404, "NOT_FOUND", `Feature flag '${id}' not found`);
    }

    flagStore.delete(id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
