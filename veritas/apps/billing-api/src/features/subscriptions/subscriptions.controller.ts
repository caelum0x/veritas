// Subscription controller: validates requests, calls SubscriptionService, sends HTTP responses.

import type { Request, Response } from "express";
import { apiSuccess, apiFailure, makePage, isErr, type ErrorCode } from "@veritas/core";
import {
  ListPlansQuerySchema,
  GetPlanParamsSchema,
  CreateSubscriptionBodySchema,
  UpdateSubscriptionBodySchema,
  CancelSubscriptionBodySchema,
  SubscriptionParamsSchema,
  ListSubscriptionsQuerySchema,
} from "./subscriptions.schema.js";
import { toSubscriptionResponse, toPlanResponse } from "./subscriptions.mapper.js";
import type { SubscriptionService } from "./subscriptions.service.js";

export class SubscriptionsController {
  constructor(private readonly service: SubscriptionService) {}

  listPlans(req: Request, res: Response): void {
    const parsed = ListPlansQuerySchema.safeParse(req.query);
    const includeInactive = parsed.success ? !parsed.data.active : false;
    const plans = this.service.listPlans(includeInactive);
    const page = makePage(plans.map(toPlanResponse), null);
    res.json(apiSuccess(page));
  }

  getPlan(req: Request, res: Response): void {
    const parsed = GetPlanParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid plan id" }));
      return;
    }
    const result = this.service.getPlan(parsed.data.planId);
    if (isErr(result)) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: result.error.message }));
      return;
    }
    res.json(apiSuccess(toPlanResponse(result.value)));
  }

  createSubscription(req: Request, res: Response): void {
    const parsed = CreateSubscriptionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid body" }),
      );
      return;
    }
    const result = this.service.createSubscription(parsed.data);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 409;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }
    res.status(201).json(apiSuccess(toSubscriptionResponse(result.value)));
  }

  getSubscription(req: Request, res: Response): void {
    const parsed = SubscriptionParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid subscription id" }));
      return;
    }
    const result = this.service.getSubscription(parsed.data.subscriptionId);
    if (isErr(result)) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: result.error.message }));
      return;
    }
    res.json(apiSuccess(toSubscriptionResponse(result.value)));
  }

  listSubscriptions(req: Request, res: Response): void {
    const parsed = ListSubscriptionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid query params" }));
      return;
    }
    const subs = this.service.listSubscriptions(parsed.data);
    const page = makePage(subs.map(toSubscriptionResponse), null);
    res.json(apiSuccess(page));
  }

  updateSubscription(req: Request, res: Response): void {
    const paramsParsed = SubscriptionParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid subscription id" }));
      return;
    }
    const bodyParsed = UpdateSubscriptionBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: bodyParsed.error.issues[0]?.message ?? "Invalid body" }),
      );
      return;
    }
    const result = this.service.updateSubscription(
      paramsParsed.data.subscriptionId,
      bodyParsed.data,
    );
    if (isErr(result)) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: result.error.message }));
      return;
    }
    res.json(apiSuccess(toSubscriptionResponse(result.value)));
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const paramsParsed = SubscriptionParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid subscription id" }));
      return;
    }
    const bodyParsed = CancelSubscriptionBodySchema.safeParse(req.body);
    const immediately = bodyParsed.success ? bodyParsed.data.immediately : false;

    const result = await this.service.cancelSubscription(
      paramsParsed.data.subscriptionId,
      immediately,
    );
    if (isErr(result)) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: result.error.message }));
      return;
    }
    res.json(apiSuccess(toSubscriptionResponse(result.value)));
  }
}
