// Reports feature controller: validates requests and delegates to ReportsFeatureService.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { ApiError } from "../../http/api-error.js";
import { sendOk, sendNoContent, sendPage } from "../../http/responder.js";
import type { ReportsFeatureService } from "./reports.service.js";
import {
  ListReportsQuerySchema,
  ReportIdParamSchema,
  VerificationIdParamSchema,
} from "./reports.schema.js";
import { toReportResponse } from "./reports.mapper.js";

/** Dependencies consumed by the reports controller. */
export interface ReportsControllerDeps {
  readonly reportsService: ReportsFeatureService;
}

/** Express controller for the /reports feature module. */
export class ReportsController {
  private readonly svc: ReportsFeatureService;

  constructor(deps: ReportsControllerDeps) {
    this.svc = deps.reportsService;
  }

  /** GET /reports — list reports with optional verification filter. */
  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = ListReportsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return next(
          ApiError.badRequest(
            parsed.error.issues.map((i) => i.message).join("; "),
          ),
        );
      }
      const result = await this.svc.list(req, parsed.data);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      const page = result.value;
      sendPage(res, {
        ...page,
        items: page.items.map(toReportResponse),
      });
    } catch (err) {
      next(err);
    }
  };

  /** GET /reports/:id — get a single report by ID. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = ReportIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return next(ApiError.badRequest("Invalid report ID."));
      }
      const result = await this.svc.getById(req, parsed.data.id);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendOk(res, toReportResponse(result.value));
    } catch (err) {
      next(err);
    }
  };

  /** GET /reports/by-verification/:verificationId — get report linked to a verification run. */
  getByVerificationId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = VerificationIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return next(ApiError.badRequest("Invalid verificationId."));
      }
      const result = await this.svc.getByVerificationId(
        req,
        parsed.data.verificationId,
      );
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendOk(res, toReportResponse(result.value));
    } catch (err) {
      next(err);
    }
  };

  /** DELETE /reports/:id — delete a report. */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = ReportIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return next(ApiError.badRequest("Invalid report ID."));
      }
      const result = await this.svc.delete(req, parsed.data.id);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };
}
