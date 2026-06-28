// Reports feature service: delegates read/delete operations to @veritas/services ReportService.
import type { Result, AppError, Page } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import {
  ReportService,
  makeServiceContext,
  type ReportView,
} from "@veritas/services";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import type { Request } from "express";
import type {
  ListReportsQuery,
} from "./reports.schema.js";

/** Minimal deps consumed by the reports feature service. */
export interface ReportsServiceDeps {
  readonly reportService: ReportService;
}

function buildContext(req: Request) {
  const authed = req as AuthenticatedRequest;
  const reqId =
    (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  return makeServiceContext(
    {
      userId: authed.userId ?? "anonymous",
      orgId: authed.orgId,
      roles: (authed.scopes as string[]) ?? [],
      apiKeyId: authed.apiKeyId,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

/** Feature-level service wrapping ReportService for the HTTP layer. */
export class ReportsFeatureService {
  private readonly svc: ReportService;

  constructor(deps: ReportsServiceDeps) {
    this.svc = deps.reportService;
  }

  async list(
    req: Request,
    query: ListReportsQuery,
  ): Promise<Result<Page<ReportView>, AppError>> {
    const ctx = buildContext(req);
    return this.svc.list(ctx, {
      verificationId: query.verificationId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getById(
    req: Request,
    reportId: string,
  ): Promise<Result<ReportView, AppError>> {
    const ctx = buildContext(req);
    return this.svc.getById(ctx, { reportId });
  }

  async getByVerificationId(
    req: Request,
    verificationId: string,
  ): Promise<Result<ReportView, AppError>> {
    const ctx = buildContext(req);
    return this.svc.getByVerificationId(ctx, { verificationId });
  }

  async delete(
    req: Request,
    reportId: string,
  ): Promise<Result<void, AppError>> {
    const ctx = buildContext(req);
    return this.svc.delete(ctx, { reportId });
  }
}
