// Pricing feature controller: validates requests, calls PricingFeatureService, returns HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { respondOk, respondError } from "../../http/responder.js";
import { toHttpError, ApiError } from "../../http/api-error.js";
import { PricingFeatureService } from "./pricing.service.js";
import {
  ComputePriceBodySchema,
  EstimateMonthlyBodySchema,
  GetPricingTableParamSchema,
  QuoteBodySchema,
} from "./pricing.schema.js";
import { toComputedPriceDto, toMonthlyEstimateDto, toPricingTableDto, toPriceQuoteDto, toCatalogEntryDto } from "./pricing.mapper.js";

export class PricingController {
  constructor(private readonly service: PricingFeatureService) {}

  computePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const parsed = ComputePriceBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await this.service.computePrice(parsed.data, authed.orgId);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toComputedPriceDto(result.value));
    } catch (err) { next(err); }
  };

  estimateMonthly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const parsed = EstimateMonthlyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await this.service.estimateMonthly(parsed.data, authed.orgId);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toMonthlyEstimateDto(result.value));
    } catch (err) { next(err); }
  };

  getPricingTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authed = req as AuthenticatedRequest;
      const parsed = GetPricingTableParamSchema.safeParse(req.params);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid path parameter", parsed.error.flatten()));
        return;
      }
      const result = await this.service.getPricingTable(parsed.data.planId, authed.orgId);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toPricingTableDto(result.value));
    } catch (err) { next(err); }
  };

  buildQuote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = QuoteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await this.service.buildQuote(parsed.data);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, toPriceQuoteDto(result.value));
    } catch (err) { next(err); }
  };

  listCatalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listCatalog();
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value.map(toCatalogEntryDto));
    } catch (err) { next(err); }
  };
}
