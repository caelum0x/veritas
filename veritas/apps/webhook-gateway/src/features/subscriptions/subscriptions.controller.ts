// Controller: validates requests, calls SubscriptionsService, and sends HTTP responses.

import type { Request, Response } from "express";
import type { Deps } from "../../container.js";
import { SubscriptionsService } from "./subscriptions.service.js";
import {
  CreateSubscriptionBodySchema,
  UpdateSubscriptionBodySchema,
  SubscriptionIdParamsSchema,
  ListSubscriptionsQuerySchema,
} from "./subscriptions.schema.js";
import { toSubscriptionDto, toSubscriptionDtoList } from "./subscriptions.mapper.js";
import { ApiError } from "../../http/api-error.js";

function sendError(res: Response, e: unknown): void {
  if (e instanceof ApiError) {
    res.status(e.statusCode).json({ success: false, data: null, error: { code: e.code, message: e.message } });
    return;
  }
  res.status(500).json({ success: false, data: null, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" } });
}

export class SubscriptionsController {
  private readonly service: SubscriptionsService;

  constructor(private readonly deps: Deps) {
    this.service = new SubscriptionsService(deps);
  }

  /** POST /subscriptions */
  readonly create = async (req: Request, res: Response): Promise<void> => {
    const bodyResult = CreateSubscriptionBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const issue = bodyResult.error.issues[0];
      res.status(422).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: issue?.message ?? "Invalid request body" } });
      return;
    }

    try {
      const sub = await this.service.create(bodyResult.data);
      res.status(201).json({ success: true, data: toSubscriptionDto(sub), error: null });
    } catch (e) {
      sendError(res, e);
    }
  };

  /** GET /subscriptions/:id */
  readonly getById = async (req: Request, res: Response): Promise<void> => {
    const paramsResult = SubscriptionIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Missing subscription id" } });
      return;
    }

    try {
      const sub = await this.service.getById(paramsResult.data.id);
      res.status(200).json({ success: true, data: toSubscriptionDto(sub), error: null });
    } catch (e) {
      sendError(res, e);
    }
  };

  /** GET /subscriptions?organizationId=... */
  readonly list = async (req: Request, res: Response): Promise<void> => {
    const queryResult = ListSubscriptionsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const issue = queryResult.error.issues[0];
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: issue?.message ?? "organizationId query param required" } });
      return;
    }

    try {
      const subs = await this.service.listByOrganization(queryResult.data.organizationId);
      res.status(200).json({ success: true, data: toSubscriptionDtoList(subs), error: null });
    } catch (e) {
      sendError(res, e);
    }
  };

  /** PATCH /subscriptions/:id */
  readonly update = async (req: Request, res: Response): Promise<void> => {
    const paramsResult = SubscriptionIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Missing subscription id" } });
      return;
    }

    const bodyResult = UpdateSubscriptionBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const issue = bodyResult.error.issues[0];
      res.status(422).json({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: issue?.message ?? "Invalid request body" } });
      return;
    }

    try {
      const sub = await this.service.update(paramsResult.data.id, bodyResult.data);
      res.status(200).json({ success: true, data: toSubscriptionDto(sub), error: null });
    } catch (e) {
      sendError(res, e);
    }
  };

  /** DELETE /subscriptions/:id */
  readonly remove = async (req: Request, res: Response): Promise<void> => {
    const paramsResult = SubscriptionIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Missing subscription id" } });
      return;
    }

    try {
      await this.service.delete(paramsResult.data.id);
      res.status(204).send();
    } catch (e) {
      sendError(res, e);
    }
  };
}
