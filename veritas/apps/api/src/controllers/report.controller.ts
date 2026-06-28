// Report controller handlers — list, get by ID, get by verification ID, and delete reports.
import type { Request, Response, NextFunction } from "express";
import { epochToIso, apiPage, type Id } from "@veritas/core";
import type { ReportService, ServiceContext } from "@veritas/services";
import { makeServiceContext } from "@veritas/services";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondNoContent, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  listReportsQuerySchema,
  reportIdParamSchema,
} from "../validators/report.validator.js";

function toId(value: string): Id<string> {
  return value as Id<string>;
}

function buildContext(req: Request): ServiceContext {
  const authed = req as AuthenticatedRequest;
  const reqId = req.requestId ?? "unknown";
  return makeServiceContext(
    {
      userId: toId(authed.userId ?? "anonymous"),
      orgId: authed.orgId ? toId(authed.orgId) : undefined,
      roles: authed.scopes ?? [],
      apiKeyId: authed.apiKeyId ? toId(authed.apiKeyId) : undefined,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export function makeReportController(reportService: ReportService) {
  const listReports = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listReportsQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await reportService.list(ctx, {
        verificationId: query.verificationId,
        cursor: query.cursor,
        limit: query.limit ?? 20,
      });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      const page = result.value;
      res.status(200).json(
        apiPage(page.items, {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        }),
      );
    },
  );

  const getReport = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = reportIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await reportService.getById(ctx, { reportId: id });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const getReportByVerificationId = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const verificationId = req.params["verificationId"] ?? "";
      const ctx = buildContext(req);
      const result = await reportService.getByVerificationId(ctx, { verificationId });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const deleteReport = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = reportIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await reportService.delete(ctx, { reportId: id });
      if (!result.ok) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondNoContent(res);
    },
  );

  return { listReports, getReport, getReportByVerificationId, deleteReport };
}
