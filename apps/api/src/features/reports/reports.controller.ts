// Reports controller: validates requests, calls the feature service, maps responses to HTTP.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { respondOk, respondPage, respondNoContent } from "../../http/responder.js";
import { toHttpError } from "../../http/api-error.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import {
  listReportsQuerySchema,
  reportIdParamSchema,
  verificationIdParamSchema,
} from "./reports.schema.js";
import { toReportResponse } from "./reports.mapper.js";
import type { ReportFeatureDeps } from "./reports.service.js";
import {
  getReportById,
  getReportByVerificationId,
  listReports,
  deleteReport,
} from "./reports.service.js";

function traceInfo(req: Request) {
  const requestId: string = (req as Request & { requestId?: string }).requestId ?? "unknown";
  return { traceId: requestId, requestId };
}

/** GET /v1/reports — list reports with optional verificationId filter. */
export function makeListReportsHandlers(deps: ReportFeatureDeps) {
  return [
    validateQuery(listReportsQuerySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const query = listReportsQuerySchema.parse(req.query);
      const { traceId, requestId } = traceInfo(req);
      const result = await listReports(deps, { verificationId: query.verificationId, cursor: query.cursor, limit: query.limit }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondPage(res, { ...result.value, items: result.value.items.map(toReportResponse) });
    }),
  ];
}

/** GET /v1/reports/:reportId — fetch single report by ID. */
export function makeGetReportHandlers(deps: ReportFeatureDeps) {
  return [
    validateParams(reportIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { reportId } = reportIdParamSchema.parse(req.params);
      const { traceId, requestId } = traceInfo(req);
      const result = await getReportById(deps, { reportId }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondOk(res, toReportResponse(result.value));
    }),
  ];
}

/** GET /v1/reports/by-verification/:verificationId — fetch report by verification run ID. */
export function makeGetReportByVerificationHandlers(deps: ReportFeatureDeps) {
  return [
    validateParams(verificationIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { verificationId } = verificationIdParamSchema.parse(req.params);
      const { traceId, requestId } = traceInfo(req);
      const result = await getReportByVerificationId(deps, { verificationId }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondOk(res, toReportResponse(result.value));
    }),
  ];
}

/** DELETE /v1/reports/:reportId — delete a report. */
export function makeDeleteReportHandlers(deps: ReportFeatureDeps) {
  return [
    validateParams(reportIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { reportId } = reportIdParamSchema.parse(req.params);
      const { traceId, requestId } = traceInfo(req);
      const result = await deleteReport(deps, { reportId }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondNoContent(res);
    }),
  ];
}
