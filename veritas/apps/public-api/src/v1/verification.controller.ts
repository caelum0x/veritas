// Controller for v1 verification endpoints — delegates to VerificationJobService.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr } from "@veritas/core";
import { JobStatus } from "@veritas/core";
import type { VerificationJobService } from "@veritas/services";
import type { ServiceContext } from "@veritas/services";
import { ApiError } from "../http/api-error.js";
import type { Responder } from "../http/responder.js";

/** Extend Express Request to carry a resolved ServiceContext added by middleware. */
interface RequestWithContext extends Request {
  serviceContext?: ServiceContext;
}

export interface VerificationControllerDeps {
  readonly verificationJobService: VerificationJobService;
  readonly responder: Responder;
}

const SubmitBodySchema = z.object({
  text: z.string().min(1).optional(),
  claims: z.array(z.string().min(1)).min(1).optional(),
  context: z.string().optional(),
  allowedDomains: z.array(z.string().min(1)).optional(),
  idempotencyKey: z.string().optional(),
});

const ListQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Express controller for /v1/verifications */
export class VerificationController {
  private readonly svc: VerificationJobService;
  private readonly res: Responder;

  constructor(deps: VerificationControllerDeps) {
    this.svc = deps.verificationJobService;
    this.res = deps.responder;
  }

  /** POST /v1/verifications — enqueue a new verification job. */
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SubmitBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return next(ApiError.badRequest(parsed.error.issues.map((i) => i.message).join("; ")));
      }
      const ctx = (req as RequestWithContext).serviceContext as ServiceContext;
      const result = await this.svc.submit(ctx, parsed.data);
      if (isErr(result)) {
        return next(ApiError.fromServiceError(result.error as { name: string; message: string }));
      }
      this.res.created(res, result.value);
    } catch (err) {
      next(err);
    }
  };

  /** GET /v1/verifications — list jobs for the authenticated principal. */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return next(ApiError.badRequest(parsed.error.issues.map((i) => i.message).join("; ")));
      }
      const ctx = (req as RequestWithContext).serviceContext as ServiceContext;
      const result = await this.svc.list(ctx, parsed.data);
      if (isErr(result)) {
        return next(ApiError.fromServiceError(result.error as { name: string; message: string }));
      }
      this.res.page(res, result.value);
    } catch (err) {
      next(err);
    }
  };

  /** GET /v1/verifications/:jobId — fetch a single job. */
  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = (req as RequestWithContext).serviceContext as ServiceContext;
      const result = await this.svc.getById(ctx, { jobId: req.params["jobId"] ?? "" });
      if (isErr(result)) {
        return next(ApiError.fromServiceError(result.error as { name: string; message: string }));
      }
      this.res.ok(res, result.value);
    } catch (err) {
      next(err);
    }
  };

  /** DELETE /v1/verifications/:jobId — cancel a pending/running job. */
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = (req as RequestWithContext).serviceContext as ServiceContext;
      const result = await this.svc.cancel(ctx, { jobId: req.params["jobId"] ?? "" });
      if (isErr(result)) {
        return next(ApiError.fromServiceError(result.error as { name: string; message: string }));
      }
      this.res.ok(res, result.value);
    } catch (err) {
      next(err);
    }
  };
}
