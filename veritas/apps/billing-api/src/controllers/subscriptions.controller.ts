// subscriptions.controller.ts: handles subscription plan listing and retrieval.

import type { Request, Response } from "express";
import { PLAN_CATALOG, getPlanById } from "@veritas/billing";
import { apiSuccess, apiFailure, makePage } from "@veritas/core";

export class SubscriptionsController {
  listPlans(_req: Request, res: Response): void {
    const activePlans = PLAN_CATALOG.filter((p) => p.isActive);
    const page = makePage([...activePlans], null);
    res.json(apiSuccess(page));
  }

  getPlan(req: Request, res: Response): void {
    const { planId } = req.params as { planId: string };
    const plan = getPlanById(planId);
    if (plan === undefined) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: `Plan '${planId}' not found` }));
      return;
    }
    res.json(apiSuccess(plan));
  }
}
