// Verification-jobs controller: validates requests, calls the feature service, maps responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { respondCreated, respondOk, respondPage } from "../../http/responder.js";
import { toHttpError } from "../../http/api-error.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  submitJobBodySchema,
  listJobsQuerySchema,
  jobIdParamSchema,
} from "./verification-jobs.schema.js";
import { toJobResponse } from "./verification-jobs.mapper.js";
import type { VerificationJobFeatureDeps } from "./verification-jobs.service.js";
import {
  submitJob,
  getJobById,
  cancelJob,
  listJobs,
} from "./verification-jobs.service.js";

function traceInfo(req: Request) {
  const r = req as AuthenticatedRequest;
  const requestId: string = (req as Request & { requestId?: string }).requestId ?? "unknown";
  return { traceId: requestId, requestId };
}

/** POST /v1/verification-jobs — submit a new job. */
export function makeSubmitJobHandlers(deps: VerificationJobFeatureDeps) {
  return [
    validateBody(submitJobBodySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const body = submitJobBodySchema.parse(req.body);
      const { traceId, requestId } = traceInfo(req);
      const result = await submitJob(deps, body, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondCreated(res, toJobResponse(result.value));
    }),
  ];
}

/** GET /v1/verification-jobs — list jobs. */
export function makeListJobsHandlers(deps: VerificationJobFeatureDeps) {
  return [
    validateQuery(listJobsQuerySchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const query = listJobsQuerySchema.parse(req.query);
      const { traceId, requestId } = traceInfo(req);
      const result = await listJobs(deps, { status: query.status, cursor: query.cursor, limit: query.limit }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondPage(res, { ...result.value, items: result.value.items.map(toJobResponse) });
    }),
  ];
}

/** GET /v1/verification-jobs/:jobId — fetch single job. */
export function makeGetJobHandlers(deps: VerificationJobFeatureDeps) {
  return [
    validateParams(jobIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { jobId } = jobIdParamSchema.parse(req.params);
      const { traceId, requestId } = traceInfo(req);
      const result = await getJobById(deps, { jobId }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondOk(res, toJobResponse(result.value));
    }),
  ];
}

/** DELETE /v1/verification-jobs/:jobId — cancel queued job. */
export function makeCancelJobHandlers(deps: VerificationJobFeatureDeps) {
  return [
    validateParams(jobIdParamSchema),
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { jobId } = jobIdParamSchema.parse(req.params);
      const { traceId, requestId } = traceInfo(req);
      const result = await cancelJob(deps, { jobId }, traceId, requestId);
      if (isErr(result)) { next(toHttpError(result.error)); return; }
      respondOk(res, toJobResponse(result.value));
    }),
  ];
}
