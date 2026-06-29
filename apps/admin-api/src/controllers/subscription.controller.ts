// Admin controller for subscription CRUD and lifecycle operations
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";
import { sendPage } from "../http/responder.js";
import {
  listSubscriptionsSchema,
  getSubscriptionSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
} from "../validators/subscription.validator.js";

export class SubscriptionController {
  listSubscriptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void listSubscriptionsSchema.parse(req.query);
      // Services layer would provide actual data; placeholder page returned
      const items: unknown[] = [];
      sendPage(res, items, { nextCursor: null, hasMore: false, total: 0 });
    } catch (err) {
      next(err);
    }
  };

  getSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getSubscriptionSchema.parse(req.params);
      // Delegate to subscription service (injected via DI in production)
      void id;
      throw new HttpError(404, "NOT_FOUND", `Subscription ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  createSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createSubscriptionSchema.parse(req.body);
      void body;
      throw new HttpError(501, "UNAVAILABLE", "Subscription creation requires billing service");
    } catch (err) {
      next(err);
    }
  };

  updateSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getSubscriptionSchema.parse(req.params);
      const body = updateSubscriptionSchema.parse(req.body);
      void id;
      void body;
      throw new HttpError(404, "NOT_FOUND", `Subscription ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  cancelSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getSubscriptionSchema.parse(req.params);
      const body = cancelSubscriptionSchema.parse(req.body);
      void id;
      void body;
      throw new HttpError(404, "NOT_FOUND", `Subscription ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  reactivateSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getSubscriptionSchema.parse(req.params);
      void id;
      throw new HttpError(404, "NOT_FOUND", `Subscription ${id} not found`);
    } catch (err) {
      next(err);
    }
  };
}

export const subscriptionController = new SubscriptionController();
