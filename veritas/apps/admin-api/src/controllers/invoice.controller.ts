// Invoice admin controller — list, get, void invoices
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { sendOk } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import { parseOrThrow } from "@veritas/core";
import {
  listInvoicesQuerySchema,
  getInvoiceParamsSchema,
  voidInvoiceParamsSchema,
  voidInvoiceBodySchema,
} from "../validators/invoice.validator.js";

export class InvoiceController {
  constructor(
    private readonly invoiceService: {
      list(query: unknown): Promise<unknown>;
      getById(id: string): Promise<unknown>;
      voidInvoice(id: string, reason?: string): Promise<unknown>;
    }
  ) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = parseOrThrow(listInvoicesQuerySchema, req.query);
      const result = await this.invoiceService.list(query);
      if (isErr(result as never)) {
        next(new HttpError(400, "INTERNAL", "Failed to list invoices"));
        return;
      }
      sendOk(res, (result as { value: unknown }).value);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = parseOrThrow(getInvoiceParamsSchema, req.params);
      const result = await this.invoiceService.getById(id);
      if (isErr(result as never)) {
        next(new HttpError(404, "NOT_FOUND", `Invoice ${id} not found`));
        return;
      }
      sendOk(res, (result as { value: unknown }).value);
    } catch (err) {
      next(err);
    }
  };

  voidInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = parseOrThrow(voidInvoiceParamsSchema, req.params);
      const body = parseOrThrow(voidInvoiceBodySchema, req.body);
      const result = await this.invoiceService.voidInvoice(id, body.reason);
      if (isErr(result as never)) {
        next(new HttpError(400, "INTERNAL", `Failed to void invoice ${id}`));
        return;
      }
      sendOk(res, (result as { value: unknown }).value);
    } catch (err) {
      next(err);
    }
  };
}
