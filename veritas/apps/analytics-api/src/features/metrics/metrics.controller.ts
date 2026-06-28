// Metrics controller: validates requests, delegates to service, formats responses.
import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { MetricsService } from "./metrics.service.js";
import {
  MetricsQuerySchema,
  PlatformMetricsQuerySchema,
  TrustTrendsQuerySchema,
  AnalyticsReportQuerySchema,
  EventsQuerySchema,
  TrackEventBodySchema,
} from "./metrics.schema.js";
import {
  toPlatformMetricsResponse,
  toAnalyticsReportResponse,
  toTrustTrendsResponse,
  toEventsListResponse,
} from "./metrics.mapper.js";

export class MetricsController {
  readonly #service: MetricsService;

  constructor(service: MetricsService) {
    this.#service = service;
  }

  getVerificationMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = MetricsQuerySchema.parse(req.query);
      const result = await this.#service.getVerificationMetrics(query);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toPlatformMetricsResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  getPlatformMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = PlatformMetricsQuerySchema.parse(req.query);
      const result = await this.#service.getPlatformMetrics(query);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toPlatformMetricsResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  getTrustTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = TrustTrendsQuerySchema.parse(req.query);
      const result = await this.#service.getTrustTrends(query);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toTrustTrendsResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  getAnalyticsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = AnalyticsReportQuerySchema.parse(req.query);
      const result = await this.#service.getAnalyticsReport(query);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toAnalyticsReportResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  listEvents = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const query = EventsQuerySchema.parse(req.query);
      const result = this.#service.queryEvents(query);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.json({ success: true, data: toEventsListResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  trackEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = TrackEventBodySchema.parse(req.body);
      const result = await this.#service.trackEvent(body);
      if (!isOk(result)) {
        res.status(500).json({ success: false, error: { code: result.error.code, message: result.error.message } });
        return;
      }
      res.status(202).json({ success: true, data: { accepted: true } });
    } catch (e) {
      next(e);
    }
  };
}
