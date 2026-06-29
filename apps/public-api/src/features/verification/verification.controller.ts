// Verification feature controller: validates requests and delegates to VerificationService.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { ApiError } from "../../http/api-error.js";
import { sendCreated, sendOk, sendPage } from "../../http/responder.js";
import type { VerificationService } from "./verification.service.js";
import {
  SubmitVerificationBodySchema,
  ListVerificationsQuerySchema,
  JobIdParamSchema,
} from "./verification.schema.js";
import { toJobResponse } from "./verification.mapper.js";

/** Dependencies the controller needs from the feature. */
export interface VerificationControllerDeps {
  readonly verificationService: VerificationService;
}

/** Express controller for the /verifications feature module. */
export class VerificationFeatureController {
  private readonly svc: VerificationService;

  constructor(deps: VerificationControllerDeps) {
    this.svc = deps.verificationService;
  }

  /** POST /verifications — enqueue a new verification job. */
  submit = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = SubmitVerificationBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          ApiError.badRequest(
            parsed.error.issues.map((i) => i.message).join("; "),
          ),
        );
      }
      const result = await this.svc.submit(req, parsed.data);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendCreated(res, toJobResponse(result.value));
    } catch (err) {
      next(err);
    }
  };

  /** GET /verifications — list jobs for the authenticated principal. */
  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = ListVerificationsQuerySchema.safeParse(req.query);
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
        items: page.items.map(toJobResponse),
      });
    } catch (err) {
      next(err);
    }
  };

  /** GET /verifications/:jobId — get a single job by ID. */
  get = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = JobIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return next(ApiError.badRequest("Invalid job ID."));
      }
      const result = await this.svc.getById(req, parsed.data.jobId);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendOk(res, toJobResponse(result.value));
    } catch (err) {
      next(err);
    }
  };

  /** DELETE /verifications/:jobId — cancel a pending job. */
  cancel = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = JobIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return next(ApiError.badRequest("Invalid job ID."));
      }
      const result = await this.svc.cancel(req, parsed.data.jobId);
      if (isErr(result)) {
        return next(
          ApiError.fromServiceError(
            result.error as { name: string; message: string },
          ),
        );
      }
      sendOk(res, toJobResponse(result.value));
    } catch (err) {
      next(err);
    }
  };
}
