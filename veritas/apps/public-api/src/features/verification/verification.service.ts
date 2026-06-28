// Verification feature service: delegates job lifecycle operations to @veritas/services VerificationJobService.
import { isErr } from "@veritas/core";
import type { Result, AppError, Page } from "@veritas/core";
import {
  VerificationJobService,
  makeServiceContext,
  type JobView,
} from "@veritas/services";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import type { Request } from "express";
import { epochToIso } from "@veritas/core";
import type {
  SubmitVerificationBody,
  ListVerificationsQuery,
} from "./verification.schema.js";

/** Minimal deps consumed by this feature service (drawn from container Deps). */
export interface VerificationServiceDeps {
  readonly verificationJobService: VerificationJobService;
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

/** Feature-level service wrapping VerificationJobService for the HTTP layer. */
export class VerificationService {
  private readonly svc: VerificationJobService;

  constructor(deps: VerificationServiceDeps) {
    this.svc = deps.verificationJobService;
  }

  async submit(
    req: Request,
    body: SubmitVerificationBody,
  ): Promise<Result<JobView, AppError>> {
    const ctx = buildContext(req);
    return this.svc.submit(ctx, {
      text: body.text,
      claims: body.claims,
      context: body.context,
      allowedDomains: body.allowedDomains,
      idempotencyKey: body.idempotencyKey,
    });
  }

  async list(
    req: Request,
    query: ListVerificationsQuery,
  ): Promise<Result<Page<JobView>, AppError>> {
    const ctx = buildContext(req);
    return this.svc.list(ctx, {
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getById(
    req: Request,
    jobId: string,
  ): Promise<Result<JobView, AppError>> {
    const ctx = buildContext(req);
    return this.svc.getById(ctx, { jobId });
  }

  async cancel(
    req: Request,
    jobId: string,
  ): Promise<Result<JobView, AppError>> {
    const ctx = buildContext(req);
    return this.svc.cancel(ctx, { jobId });
  }
}
