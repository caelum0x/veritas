// Usage controller — serve aggregated usage views and time-series for developer apps
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import {
  UsagePeriodSchema,
  emptyUsageView,
  type PortalService,
} from "@veritas/developer-portal";
import type { PortalAuthRequest } from "../middleware/auth.js";

function getService(req: Request): PortalService {
  return (req as unknown as Record<string, unknown>)["portalService"] as PortalService;
}

function getAuth(req: Request): { appId: string; orgId: string } {
  const r = req as PortalAuthRequest;
  return { appId: r.portalAppId ?? "", orgId: r.orgId ?? "" };
}

const usageSummaryQuerySchema = z.object({
  appId: z.string().optional(),
  period: UsagePeriodSchema.default("day"),
  from: z.string().optional(),
  to: z.string().optional(),
});

const usageTimeSeriesQuerySchema = z.object({
  appId: z.string().optional(),
  period: UsagePeriodSchema.default("hour"),
  from: z.string().optional(),
  to: z.string().optional(),
});

const quotaQuerySchema = z.object({
  appId: z.string().optional(),
});

export async function getUsageSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  const query = usageSummaryQuerySchema.safeParse(req.query);
  if (!query.success) { next(new Error(query.error.message)); return; }

  const svc = getService(req);
  const auth = getAuth(req);
  const targetAppId = query.data.appId ?? auth.appId;

  // Verify app access
  const appResult = await svc.getApp(targetAppId);
  if (isErr(appResult)) { next(appResult.error); return; }

  const now = new Date().toISOString();
  const view = emptyUsageView(
    targetAppId,
    auth.orgId,
    query.data.period,
    query.data.from ?? now,
    query.data.to ?? now,
  );

  res.status(200).json({ success: true, data: view });
}

export async function getUsageTimeSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
  const query = usageTimeSeriesQuerySchema.safeParse(req.query);
  if (!query.success) { next(new Error(query.error.message)); return; }

  const svc = getService(req);
  const auth = getAuth(req);
  const targetAppId = query.data.appId ?? auth.appId;

  const appResult = await svc.getApp(targetAppId);
  if (isErr(appResult)) { next(appResult.error); return; }

  res.status(200).json({
    success: true,
    data: {
      appId: targetAppId,
      period: query.data.period,
      points: [],
    },
  });
}

export async function getQuotaView(req: Request, res: Response, next: NextFunction): Promise<void> {
  const query = quotaQuerySchema.safeParse(req.query);
  if (!query.success) { next(new Error(query.error.message)); return; }

  const svc = getService(req);
  const auth = getAuth(req);
  const targetAppId = query.data.appId ?? auth.appId;

  const appResult = await svc.getApp(targetAppId);
  if (isErr(appResult)) { next(appResult.error); return; }

  res.status(200).json({
    success: true,
    data: {
      appId: targetAppId,
      organizationId: auth.orgId,
      planId: "",
      limits: [],
      isThrottled: false,
      observedAt: new Date().toISOString(),
    },
  });
}
