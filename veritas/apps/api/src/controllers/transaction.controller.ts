// Transaction controller handlers: list transactions and retrieve a single transaction.
import type { Request, Response } from "express";
import { isErr } from "@veritas/core";
import type { Page, AppError, Result } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { HttpApiError, toHttpError } from "../http/api-error.js";
import { validateQuery, validateParams } from "../middleware/validate.js";
import {
  listTransactionsQuerySchema,
  transactionIdParamSchema,
} from "../validators/transaction.validator.js";

interface TransactionService {
  list(opts: {
    walletId?: string;
    kind?: string;
    settlementId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }): Promise<Result<Page<unknown>, AppError>>;
  getById(id: string): Promise<Result<unknown, AppError>>;
}

function getTransactionService(req: Request): TransactionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = (req as any).container ?? req.app.locals["container"];
  if (!container || typeof container.transactionService === "undefined") {
    throw new HttpApiError(503, "SERVICE_UNAVAILABLE", "Transaction service not available");
  }
  return container.transactionService as TransactionService;
}

export const listTransactionsHandler = [
  validateQuery(listTransactionsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getTransactionService(req);
    const q = req.query as Record<string, string | undefined>;

    const result = await service.list({
      walletId: q["walletId"],
      kind: q["kind"],
      settlementId: q["settlementId"],
      from: q["from"],
      to: q["to"],
      cursor: q["cursor"],
      limit: q["limit"] !== undefined ? Number(q["limit"]) : undefined,
    });

    if (isErr(result)) {
      throw toHttpError(result.error);
    }

    const page = result.value as Page<unknown>;
    res.status(200).json({
      success: true,
      data: page.items,
      meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
    });
  }),
];

export const getTransactionHandler = [
  validateParams(transactionIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const service = getTransactionService(req);
    const result = await service.getById(req.params["id"] as string);

    if (isErr(result)) {
      throw toHttpError(result.error);
    }

    res.status(200).json({ success: true, data: result.value });
  }),
];
