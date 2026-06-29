// Deliveries controller: validates requests, delegates to service, writes HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import { DeliveriesService } from "./deliveries.service.js";
import {
  DeliveryIdParamSchema,
  ListDeliveriesQuerySchema,
  RetryDeliveryBodySchema,
} from "./deliveries.schema.js";
import { toDeliveryResponse, toDeliveryResponseList } from "./deliveries.mapper.js";

export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  listBySubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ListDeliveriesQuerySchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ success: false, error: query.error.format() });
        return;
      }

      const result = await this.service.listBySubscription(
        query.data.subscriptionId,
        query.data.limit,
      );

      if (isErr(result)) {
        res.status(404).json({ success: false, error: result.error.message });
        return;
      }

      res.status(200).json({
        success: true,
        data: toDeliveryResponseList(result.value),
        meta: { total: result.value.length },
      });
    } catch (e) {
      next(e);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = DeliveryIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ success: false, error: params.error.format() });
        return;
      }

      const result = await this.service.getById(params.data.deliveryId);

      if (isErr(result)) {
        res.status(404).json({ success: false, error: result.error.message });
        return;
      }

      res.status(200).json({ success: true, data: toDeliveryResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };

  retryDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = RetryDeliveryBodySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ success: false, error: body.error.format() });
        return;
      }

      const result = await this.service.retryDelivery(body.data.deliveryId);

      if (isErr(result)) {
        res.status(404).json({ success: false, error: result.error.message });
        return;
      }

      res.status(200).json({ success: true, data: toDeliveryResponse(result.value) });
    } catch (e) {
      next(e);
    }
  };
}
