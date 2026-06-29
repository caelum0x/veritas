// Verification-job controller handlers: submit, get, list, cancel.
import type { Request, Response, NextFunction } from "express";
import {
  isErr,
  epochToIso,
  newId,
  type Logger,
} from "@veritas/core";
import {
  VerificationJobService,
  makeServiceContext,
} from "@veritas/services";
import type { Principal } from "@veritas/services";
import { asyncHandler } from "../http/async-handler.js";
import { toHttpError } from "../http/api-error.js";
import { respondOk, respondCreated, respondPage } from "../http/responder.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  submitJobBodySchema,
  listJobsQuerySchema,
  jobIdParamSchema,
  type SubmitJobBody,
  type ListJobsQuery,
  type JobIdParam,
} from "../validators/verification-job.validator.js";

/** Build a ServiceContext from an authenticated Express request. */
function ctxFrom(req: AuthenticatedRequest) {
  const principal: Principal = {
    userId: req.userId ?? "anonymous",
    orgId: req.orgId ?? undefined,
    roles: req.scopes ?? [],
    apiKeyId: req.apiKeyId ?? undefined,
  };
  const requestId = req.requestId ?? newId("req");
  return makeServiceContext(
    principal,
    requestId,
    requestId,
    epochToIso(Date.now())
  );
}

/** POST /v1/verification-jobs — submit a new verification job. */
export function makeSubmitHandler(svc: VerificationJobService, _logger: Logger) {
  return [
    validateBody(submitJobBodySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const body = req.body as SubmitJobBody;
      const ctx = ctxFrom(req as AuthenticatedRequest);

      const result = await svc.submit(ctx, {
        text: body.text,
        claims: body.claims,
        context: body.context,
        allowedDomains: body.allowedDomains,
        idempotencyKey: body.idempotencyKey,
      });

      if (isErr(result)) {
        return next(toHttpError(result.error));
      }
      respondCreated(res, result.value);
    }),
  ];
}

/** GET /v1/verification-jobs — list jobs with optional status filter. */
export function makeListHandler(svc: VerificationJobService, _logger: Logger) {
  return [
    validateQuery(listJobsQuerySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query as unknown as ListJobsQuery;
      const ctx = ctxFrom(req as AuthenticatedRequest);

      const result = await svc.list(ctx, {
        status: query.status,
        cursor: query.cursor,
        limit: query.limit,
      });

      if (isErr(result)) {
        return next(toHttpError(result.error));
      }
      respondPage(res, result.value);
    }),
  ];
}

/** GET /v1/verification-jobs/:jobId — fetch a single job by ID. */
export function makeGetByIdHandler(svc: VerificationJobService, _logger: Logger) {
  return [
    validateParams(jobIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { jobId } = req.params as unknown as JobIdParam;
      const ctx = ctxFrom(req as AuthenticatedRequest);

      const result = await svc.getById(ctx, { jobId });

      if (isErr(result)) {
        return next(toHttpError(result.error));
      }
      respondOk(res, result.value);
    }),
  ];
}

/** DELETE /v1/verification-jobs/:jobId — cancel a queued job. */
export function makeCancelHandler(svc: VerificationJobService, _logger: Logger) {
  return [
    validateParams(jobIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
      const { jobId } = req.params as unknown as JobIdParam;
      const ctx = ctxFrom(req as AuthenticatedRequest);

      const result = await svc.cancel(ctx, { jobId });

      if (isErr(result)) {
        return next(toHttpError(result.error));
      }
      respondOk(res, result.value);
    }),
  ];
}
