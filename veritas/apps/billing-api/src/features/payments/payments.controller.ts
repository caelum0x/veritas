// HTTP controller for payments: validates requests, delegates to PaymentsService, maps responses.

import type { Request, Response } from "express";
import { isErr, AppError, apiSuccess, apiFailure } from "@veritas/core";
import { PaymentsService } from "./payments.service.js";
import {
  ChargeBodySchema,
  RefundBodySchema,
  ListPaymentsQuerySchema,
} from "./payments.schema.js";
import { toPaymentResponse, toRefundResponse } from "./payments.mapper.js";

export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  async charge(req: Request, res: Response): Promise<void> {
    const parsed = ChargeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.message }),
      );
      return;
    }

    const result = await this.service.charge(parsed.data);
    if (isErr(result)) {
      const e = result.error as AppError;
      const status = e.status ?? 500;
      res.status(status).json(
        apiFailure({ code: e.code ?? "INTERNAL", message: e.message }),
      );
      return;
    }

    res.status(201).json(
      apiSuccess({
        payment: toPaymentResponse(result.value.payment),
        processorRef: result.value.processorRef,
      }),
    );
  }

  async refund(req: Request, res: Response): Promise<void> {
    const parsed = RefundBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.message }),
      );
      return;
    }

    const result = await this.service.refund(parsed.data);
    if (isErr(result)) {
      const e = result.error as AppError;
      const status = e.status ?? 500;
      res.status(status).json(
        apiFailure({ code: e.code ?? "INTERNAL", message: e.message }),
      );
      return;
    }

    res.json(
      apiSuccess(
        toRefundResponse(
          parsed.data.paymentId,
          result.value.refundRef,
          result.value.payment.status,
        ),
      ),
    );
  }

  async list(req: Request, res: Response): Promise<void> {
    const parsed = ListPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.message }),
      );
      return;
    }

    const result = await this.service.listByOrg(parsed.data.organizationId);
    if (isErr(result)) {
      const e = result.error as AppError;
      res.status(500).json(
        apiFailure({ code: "INTERNAL", message: e.message }),
      );
      return;
    }

    res.json(apiSuccess(result.value.payments.map(toPaymentResponse)));
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const { paymentId } = req.params as { paymentId: string };

    const result = await this.service.getById(paymentId);
    if (isErr(result)) {
      const e = result.error as AppError;
      const status = e.status ?? 404;
      res.status(status).json(
        apiFailure({ code: e.code ?? "NOT_FOUND", message: e.message }),
      );
      return;
    }

    res.json(apiSuccess(toPaymentResponse(result.value)));
  }
}
