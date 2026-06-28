// Admin controller for usage metrics — read-only access to usage records
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { HttpError } from "../http/api-error.js";
import { sendOk, sendPage, sendError } from "../http/responder.js";

const listUsageQuerySchema = z.object({
  organizationId: z.string().optional(),
  serviceId: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getUsageParamsSchema = z.object({ id: z.string().min(1) });

const orgScopeParamsSchema = z.object({ orgId: z.string().min(1) });
const serviceScopeParamsSchema = z.object({ serviceId: z.string().min(1) });

const scopedQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  metric: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface UsageRecord {
  id: string;
  organizationId: string;
  serviceId: string;
  metric: string;
  quantity: number;
  periodStart: string;
  periodEnd: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface UsageService {
  listUsage(opts: unknown): Promise<{ data: UsageRecord[]; total: number; page: number; limit: number }>;
  getUsageById(id: string): Promise<UsageRecord | null>;
  listUsageByOrganization(orgId: string, opts: unknown): Promise<{ data: UsageRecord[]; total: number; page: number; limit: number }>;
  listUsageByService(serviceId: string, opts: unknown): Promise<{ data: UsageRecord[]; total: number; page: number; limit: number }>;
}

function getUsageService(req: Request): UsageService {
  const svc = (req as unknown as Record<string, unknown>)["usageService"];
  if (!svc) {
    throw new HttpError(503, "UNAVAILABLE", "Usage service not available");
  }
  return svc as UsageService;
}

export async function listUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getUsageService(req);
    const result = await svc.listUsage(parsed.data);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function getUsageRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = getUsageParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getUsageService(req);
    const record = await svc.getUsageById(parsed.data.id);
    if (!record) {
      sendError(res, 404, "NOT_FOUND", `Usage record ${parsed.data.id} not found`);
      return;
    }
    sendOk(res, record);
  } catch (err) {
    next(err);
  }
}

export async function listUsageByOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paramsParsed = orgScopeParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: paramsParsed.error.issues });
      return;
    }
    const queryParsed = scopedQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: queryParsed.error.issues });
      return;
    }
    const svc = getUsageService(req);
    const result = await svc.listUsageByOrganization(paramsParsed.data.orgId, queryParsed.data);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function listUsageByService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paramsParsed = serviceScopeParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: paramsParsed.error.issues });
      return;
    }
    const queryParsed = scopedQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: queryParsed.error.issues });
      return;
    }
    const svc = getUsageService(req);
    const result = await svc.listUsageByService(paramsParsed.data.serviceId, queryParsed.data);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}
