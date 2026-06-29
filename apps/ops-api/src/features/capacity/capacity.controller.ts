// Capacity controller — validates requests with zod, delegates to CapacityFeatureService, maps to HTTP.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  AddSamplesBodySchema,
  PlanBodySchema,
  SaturationQuerySchema,
  ForecastQuerySchema,
  RecommendQuerySchema,
  CapacityReportBodySchema,
} from "./capacity.schema.js";
import {
  toSaturationResultResponse,
  toForecastPointResponse,
  toScalingRecommendationResponse,
  toCapacityReportResponse,
} from "./capacity.mapper.js";
import type { CapacityFeatureService } from "./capacity.service.js";
import { sendOk, sendCreated } from "../../http/responder.js";

export class CapacityController {
  constructor(private readonly service: CapacityFeatureService) {}

  async addSamples(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { samples } = AddSamplesBodySchema.parse(req.body);
      this.service.ingestSamples(samples);
      sendCreated(res, { accepted: samples.length });
    } catch (e) { next(e); }
  }

  async plan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = PlanBodySchema.parse(req.body);
      const result = await this.service.computePlan(body);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, result.value);
    } catch (e) { next(e); }
  }

  async saturation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = SaturationQuerySchema.parse(req.query);
      const result = await this.service.computeSaturation(query);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, {
        saturation: result.value.saturation.map(toSaturationResultResponse),
        generatedAt: result.value.generatedAt,
      });
    } catch (e) { next(e); }
  }

  async forecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ForecastQuerySchema.parse(req.query);
      const result = await this.service.computeForecast(query);
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, {
        forecasts: result.value.forecasts.map(toForecastPointResponse),
        generatedAt: result.value.generatedAt,
      });
    } catch (e) { next(e); }
  }

  async recommend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = RecommendQuerySchema.parse(req.query);
      const result = await this.service.computeRecommendations({
        resources: query.resources,
        forecastHorizonMs: query.forecastHorizonMs,
      });
      if (isErr(result)) { next(result.error); return; }
      sendOk(res, {
        recommendations: result.value.recommendations.map(toScalingRecommendationResponse),
        utilizationByResource: result.value.utilizationByResource,
        generatedAt: result.value.generatedAt,
      });
    } catch (e) { next(e); }
  }

  async buildReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CapacityReportBodySchema.parse(req.body);
      const result = await this.service.buildCapacityReport(body);
      if (isErr(result)) { next(result.error); return; }
      sendCreated(res, toCapacityReportResponse(result.value));
    } catch (e) { next(e); }
  }
}
