// Invoice controller handlers: list, get, void, and pay invoices.
import type { Request, Response, NextFunction } from "express";
import { isErr, toPageRequest } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { toHttpError } from "../http/api-error.js";
import { respondOk, respondPage, respondNoContent } from "../http/responder.js";
import {
  listInvoicesQuerySchema,
  getInvoiceParamsSchema,
  voidInvoiceParamsSchema,
  payInvoiceParamsSchema,
  payInvoiceBodySchema,
} from "../validators/invoice.validator.js";

type InvoiceService = {
  list(opts: unknown): Promise<import("@veritas/core").Result<import("@veritas/core").Page<unknown>, import("@veritas/core").AppError>>;
  getById(id: string): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  voidInvoice(id: string, actorId: string): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  pay(id: string, opts: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
};

function getInvoiceService(req: Request): InvoiceService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container.invoiceService as InvoiceService;
}

function getActorId(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((req as any).userId as string | undefined) ?? "";
}

export const listInvoices = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const query = listInvoicesQuerySchema.parse(req.query);
    const pageRequest = toPageRequest({ cursor: query.cursor, limit: query.limit });
    const svc = getInvoiceService(req);
    const result = await svc.list({
      ...pageRequest,
      filters: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
        ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
        ...(query.fromDate ? { fromDate: query.fromDate } : {}),
        ...(query.toDate ? { toDate: query.toDate } : {}),
      },
    });
    if (isErr(result)) throw toHttpError(result.error);
    respondPage(res, result.value);
  }
);

export const getInvoice = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = getInvoiceParamsSchema.parse(req.params);
    const svc = getInvoiceService(req);
    const result = await svc.getById(id);
    if (isErr(result)) throw toHttpError(result.error);
    respondOk(res, result.value);
  }
);

export const voidInvoice = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = voidInvoiceParamsSchema.parse(req.params);
    const svc = getInvoiceService(req);
    const actorId = getActorId(req);
    const result = await svc.voidInvoice(id, actorId);
    if (isErr(result)) throw toHttpError(result.error);
    respondNoContent(res);
  }
);

export const payInvoice = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = payInvoiceParamsSchema.parse(req.params);
    const body = payInvoiceBodySchema.parse(req.body);
    const svc = getInvoiceService(req);
    const actorId = getActorId(req);
    const result = await svc.pay(id, { ...body, actorId });
    if (isErr(result)) throw toHttpError(result.error);
    respondOk(res, result.value);
  }
);
