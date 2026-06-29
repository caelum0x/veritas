// Usage controller — validates requests, delegates to UsageService, maps results to HTTP responses
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { PortalAuthRequest } from "../../middleware/auth.js";
import {
  GetUsageSummaryQuerySchema,
  GetUsageTimeSeriesQuerySchema,
  GetQuotaQuerySchema,
  GetAnalyticsReportQuerySchema,
} from "./usage.schema.js";
import { mapUsageSummary, mapTimeSeries, mapQuota, mapAnalyticsReport } from "./usage.mapper.js";
import type { UsageService } from "./usage.service.js";

function getAuth(req: Request): { appId: string; orgId: string } {
  const r = req as PortalAuthRequest;
  return { appId: r.portalAppId ?? "", orgId: r.orgId ?? "" };
}

export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = GetUsageSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(new Error(parsed.error.message));
      return;
    }

    const auth = getAuth(req);
    const appId = parsed.data.appId ?? auth.appId;

    const result = await this.usageService.getUsageSummary(
      appId,
      auth.orgId,
      parsed.data.period,
      parsed.data.from,
      parsed.data.to,
    );

    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapUsageSummary(result.value) });
  }

  async getTimeSeries(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = GetUsageTimeSeriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(new Error(parsed.error.message));
      return;
    }

    const auth = getAuth(req);
    const appId = parsed.data.appId ?? auth.appId;

    const result = await this.usageService.getUsageTimeSeries(
      appId,
      parsed.data.period,
      parsed.data.from,
      parsed.data.to,
    );

    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapTimeSeries(result.value) });
  }

  async getQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = GetQuotaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(new Error(parsed.error.message));
      return;
    }

    const auth = getAuth(req);
    const appId = parsed.data.appId ?? auth.appId;

    const result = await this.usageService.getQuotaView(appId, auth.orgId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapQuota(result.value) });
  }

  async getAnalyticsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = GetAnalyticsReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(new Error(parsed.error.message));
      return;
    }

    const auth = getAuth(req);
    const appId = parsed.data.appId ?? auth.appId;

    const result = await this.usageService.getAnalyticsReport(appId, parsed.data.window);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapAnalyticsReport(result.value) });
  }
}
