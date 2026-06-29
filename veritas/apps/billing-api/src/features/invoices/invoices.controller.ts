// Invoice controller: validates requests, delegates to InvoiceService, sends HTTP responses.

import type { Request, Response } from "express";
import { apiSuccess, apiFailure, makePage, isErr, type ErrorCode } from "@veritas/core";
import {
  GenerateInvoiceBodySchema,
  FinalizeInvoiceParamsSchema,
  MarkPaidInvoiceParamsSchema,
  VoidInvoiceParamsSchema,
  GetInvoiceParamsSchema,
  ListInvoicesQuerySchema,
  ApplyTaxBodySchema,
} from "./invoices.schema.js";
import { toInvoiceResponse } from "./invoices.mapper.js";
import type { InvoiceService } from "./invoices.service.js";

export class InvoicesController {
  constructor(private readonly service: InvoiceService) {}

  generateInvoice(req: Request, res: Response): void {
    const parsed = GenerateInvoiceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid body",
        }),
      );
      return;
    }

    const result = this.service.generateInvoice(parsed.data);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 422;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }

    const tax = this.service.getTaxResult(result.value.id);
    res.status(201).json(apiSuccess(toInvoiceResponse(result.value, tax)));
  }

  listInvoices(req: Request, res: Response): void {
    const parsed = ListInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid query params" }));
      return;
    }

    const invoiceList = this.service.listInvoices(parsed.data);
    const page = makePage(
      invoiceList.map((inv) => toInvoiceResponse(inv, this.service.getTaxResult(inv.id))),
      null,
    );
    res.json(apiSuccess(page));
  }

  getInvoice(req: Request, res: Response): void {
    const parsed = GetInvoiceParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid invoice id" }));
      return;
    }

    const result = this.service.getInvoice(parsed.data.invoiceId);
    if (isErr(result)) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: result.error.message }));
      return;
    }

    const tax = this.service.getTaxResult(result.value.id);
    res.json(apiSuccess(toInvoiceResponse(result.value, tax)));
  }

  finalizeInvoice(req: Request, res: Response): void {
    const parsed = FinalizeInvoiceParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid invoice id" }));
      return;
    }

    const result = this.service.finalizeInvoice(parsed.data.invoiceId);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 422;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }

    res.json(apiSuccess(toInvoiceResponse(result.value)));
  }

  markPaid(req: Request, res: Response): void {
    const parsed = MarkPaidInvoiceParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid invoice id" }));
      return;
    }

    const result = this.service.markPaid(parsed.data.invoiceId);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 422;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }

    res.json(apiSuccess(toInvoiceResponse(result.value)));
  }

  voidInvoice(req: Request, res: Response): void {
    const parsed = VoidInvoiceParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid invoice id" }));
      return;
    }

    const result = this.service.voidInvoice(parsed.data.invoiceId);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 422;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }

    res.json(apiSuccess(toInvoiceResponse(result.value)));
  }

  async applyTax(req: Request, res: Response): Promise<void> {
    const parsed = ApplyTaxBodySchema.safeParse({ ...req.body, invoiceId: req.params["invoiceId"] });
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid request",
        }),
      );
      return;
    }

    const result = await this.service.applyTax(parsed.data);
    if (isErr(result)) {
      const status = result.error.name === "NotFoundError" ? 404 : 422;
      res.status(status).json(
        apiFailure({ code: result.error.name.toUpperCase() as ErrorCode, message: result.error.message }),
      );
      return;
    }

    res.json(apiSuccess(result.value));
  }
}
