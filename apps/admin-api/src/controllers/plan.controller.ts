// Admin controller for plan management operations
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";
import { sendOk, sendCreated, sendNoContent, sendPage, sendError } from "../http/responder.js";
import {
  listPlansSchema,
  getPlanSchema,
  createPlanSchema,
  updatePlanSchema,
  deletePlanSchema,
  listPlanSubscriptionsSchema,
} from "../validators/plan.validator.js";

interface PlanRecord {
  id: string;
  name: string;
  description?: string;
  priceUsdc: number;
  billingInterval: string;
  isActive: boolean;
  trialDays?: number;
  features?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionRecord {
  id: string;
  planId: string;
  organizationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanService {
  listPlans(opts: unknown): Promise<{ data: PlanRecord[]; total: number; page: number; limit: number }>;
  getPlanById(id: string): Promise<PlanRecord | null>;
  createPlan(data: unknown): Promise<PlanRecord>;
  updatePlan(id: string, data: unknown): Promise<PlanRecord | null>;
  deletePlan(id: string): Promise<boolean>;
  listPlanSubscriptions(
    planId: string,
    opts: unknown,
  ): Promise<{ data: SubscriptionRecord[]; total: number; page: number; limit: number }>;
}

function getPlanService(req: Request): PlanService {
  const svc = (req as unknown as Record<string, unknown>)["planService"];
  if (!svc) {
    throw new HttpError(503, "UNAVAILABLE", "Plan service not available");
  }
  return svc as PlanService;
}

export async function listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listPlansSchema.safeParse({ query: req.query });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const result = await svc.listPlans(parsed.data.query);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = getPlanSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const plan = await svc.getPlanById(parsed.data.params.id);
    if (!plan) {
      sendError(res, 404, "NOT_FOUND", `Plan ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPlanSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request body", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const plan = await svc.createPlan(parsed.data.body);
    sendCreated(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updatePlanSchema.safeParse({ params: req.params, body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const plan = await svc.updatePlan(parsed.data.params.id, parsed.data.body);
    if (!plan) {
      sendError(res, 404, "NOT_FOUND", `Plan ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = deletePlanSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const deleted = await svc.deletePlan(parsed.data.params.id);
    if (!deleted) {
      sendError(res, 404, "NOT_FOUND", `Plan ${parsed.data.params.id} not found`);
      return;
    }
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function listPlanSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listPlanSubscriptionsSchema.safeParse({ params: req.params, query: req.query });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getPlanService(req);
    const result = await svc.listPlanSubscriptions(parsed.data.params.id, parsed.data.query);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}
