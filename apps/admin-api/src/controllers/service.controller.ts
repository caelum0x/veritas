// Admin controller for service management operations
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";
import { sendOk, sendCreated, sendNoContent, sendPage, sendError } from "../http/responder.js";
import {
  listServicesSchema,
  getServiceSchema,
  createServiceSchema,
  updateServiceSchema,
  deleteServiceSchema,
} from "../validators/service.validator.js";

interface ServiceRecord {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  endpoint: string;
  isActive: boolean;
  pricePerCallUsdc: number;
  rateLimitPerMinute?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ServiceService {
  listServices(opts: unknown): Promise<{ data: ServiceRecord[]; total: number; page: number; limit: number }>;
  getServiceById(id: string): Promise<ServiceRecord | null>;
  createService(data: unknown): Promise<ServiceRecord>;
  updateService(id: string, data: unknown): Promise<ServiceRecord | null>;
  deleteService(id: string): Promise<boolean>;
}

function getServiceService(req: Request): ServiceService {
  const svc = (req as unknown as Record<string, unknown>)["serviceService"];
  if (!svc) {
    throw new HttpError(503, "UNAVAILABLE", "Service service not available");
  }
  return svc as ServiceService;
}

export async function listServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listServicesSchema.safeParse({ query: req.query });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid query parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getServiceService(req);
    const result = await svc.listServices(parsed.data.query);
    sendPage(res, result.data, { total: result.total, nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function getService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = getServiceSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getServiceService(req);
    const service = await svc.getServiceById(parsed.data.params.id);
    if (!service) {
      sendError(res, 404, "NOT_FOUND", `Service ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, service);
  } catch (err) {
    next(err);
  }
}

export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createServiceSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request body", { issues: parsed.error.issues });
      return;
    }
    const svc = getServiceService(req);
    const service = await svc.createService(parsed.data.body);
    sendCreated(res, service);
  } catch (err) {
    next(err);
  }
}

export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateServiceSchema.safeParse({ params: req.params, body: req.body });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid request", { issues: parsed.error.issues });
      return;
    }
    const svc = getServiceService(req);
    const service = await svc.updateService(parsed.data.params.id, parsed.data.body);
    if (!service) {
      sendError(res, 404, "NOT_FOUND", `Service ${parsed.data.params.id} not found`);
      return;
    }
    sendOk(res, service);
  } catch (err) {
    next(err);
  }
}

export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = deleteServiceSchema.safeParse({ params: req.params });
    if (!parsed.success) {
      sendError(res, 422, "VALIDATION", "Invalid parameters", { issues: parsed.error.issues });
      return;
    }
    const svc = getServiceService(req);
    const deleted = await svc.deleteService(parsed.data.params.id);
    if (!deleted) {
      sendError(res, 404, "NOT_FOUND", `Service ${parsed.data.params.id} not found`);
      return;
    }
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
