// RetentionController: validates requests and delegates to RetentionService, responds with mapped HTTP shapes.

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { RetentionService } from "./retention.service.js";
import {
  toPolicy,
  toLegalHold,
  toExpiryEvaluation,
} from "./retention.mapper.js";
import {
  CreatePolicyBodySchema,
  UpdatePolicyBodySchema,
  PolicyParamsSchema,
  ListPoliciesQuerySchema,
  CreateLegalHoldBodySchema,
  LegalHoldParamsSchema,
  ListLegalHoldsQuerySchema,
  EvaluateRecordsBodySchema,
} from "./retention.schema.js";
import { sendOk, sendCreated, sendNoContent, sendError } from "../../http/responder.js";
import type { RetentionCategory } from "@veritas/retention";

export class RetentionController {
  constructor(private readonly service: RetentionService) {}

  listPolicies(req: Request, res: Response, next: NextFunction): void {
    try {
      const query = ListPoliciesQuerySchema.parse(req.query);
      const policies = this.service.listPolicies(query.category as RetentionCategory | undefined);
      sendOk(res, policies.map(toPolicy));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid query parameters", e.flatten());
        return;
      }
      next(e);
    }
  }

  getPolicy(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = PolicyParamsSchema.parse(req.params);
      const result = this.service.getPolicy(id);
      if (!result.ok) {
        sendError(res, 404, "RETENTION_POLICY_NOT_FOUND", result.error.message);
        return;
      }
      sendOk(res, toPolicy(result.value));
    } catch (e) {
      next(e);
    }
  }

  createPolicy(req: Request, res: Response, next: NextFunction): void {
    try {
      const body = CreatePolicyBodySchema.parse(req.body);
      const result = this.service.createPolicy(body);
      if (!result.ok) {
        const status = (result.error as { statusCode?: number }).statusCode ?? 409;
        sendError(res, status, "POLICY_CONFLICT", result.error.message);
        return;
      }
      sendCreated(res, toPolicy(result.value));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", e.flatten());
        return;
      }
      next(e);
    }
  }

  updatePolicy(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = PolicyParamsSchema.parse(req.params);
      const body = UpdatePolicyBodySchema.parse(req.body);
      const result = this.service.updatePolicy(id, body);
      if (!result.ok) {
        sendError(res, 404, "RETENTION_POLICY_NOT_FOUND", result.error.message);
        return;
      }
      sendOk(res, toPolicy(result.value));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", e.flatten());
        return;
      }
      next(e);
    }
  }

  deletePolicy(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = PolicyParamsSchema.parse(req.params);
      const result = this.service.deletePolicy(id);
      if (!result.ok) {
        sendError(res, 404, "RETENTION_POLICY_NOT_FOUND", result.error.message);
        return;
      }
      sendNoContent(res);
    } catch (e) {
      next(e);
    }
  }

  listLegalHolds(req: Request, res: Response, next: NextFunction): void {
    try {
      const query = ListLegalHoldsQuerySchema.parse(req.query);
      const holds = this.service.listLegalHolds(query.status);
      sendOk(res, holds.map(toLegalHold));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid query parameters", e.flatten());
        return;
      }
      next(e);
    }
  }

  getLegalHold(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = LegalHoldParamsSchema.parse(req.params);
      const result = this.service.getLegalHold(id);
      if (!result.ok) {
        sendError(res, 404, "LEGAL_HOLD_NOT_FOUND", result.error.message);
        return;
      }
      sendOk(res, toLegalHold(result.value));
    } catch (e) {
      next(e);
    }
  }

  createLegalHold(req: Request, res: Response, next: NextFunction): void {
    try {
      const body = CreateLegalHoldBodySchema.parse(req.body);
      const hold = this.service.createLegalHold(body);
      sendCreated(res, toLegalHold(hold));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", e.flatten());
        return;
      }
      next(e);
    }
  }

  releaseLegalHold(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = LegalHoldParamsSchema.parse(req.params);
      const result = this.service.releaseLegalHold(id);
      if (!result.ok) {
        sendError(res, 404, "LEGAL_HOLD_NOT_FOUND", result.error.message);
        return;
      }
      sendOk(res, toLegalHold(result.value));
    } catch (e) {
      next(e);
    }
  }

  evaluateRecords(req: Request, res: Response, next: NextFunction): void {
    try {
      const body = EvaluateRecordsBodySchema.parse(req.body);
      const evaluations = this.service.evaluateRecords(body.records);
      sendOk(res, evaluations.map(toExpiryEvaluation));
    } catch (e) {
      if (e instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", e.flatten());
        return;
      }
      next(e);
    }
  }

  getAuditLog(_req: Request, res: Response, next: NextFunction): void {
    try {
      const entries = this.service.getAuditLog();
      sendOk(res, entries);
    } catch (e) {
      next(e);
    }
  }
}
