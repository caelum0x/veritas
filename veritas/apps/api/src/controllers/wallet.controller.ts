// Wallet controller handlers for listing, retrieving, creating wallets and recording deposits.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { toPageRequest } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { responder } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import {
  getWalletParamsSchema,
  createWalletBodySchema,
  listWalletsQuerySchema,
  depositParamsSchema,
  depositBodySchema,
} from "../validators/wallet.validator.js";

function getWalletService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container.walletService as {
    list(opts: unknown): Promise<import("@veritas/core").Result<import("@veritas/core").Page<unknown>, import("@veritas/core").AppError>>;
    getById(id: string): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
    create(body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
    deposit(id: string, body: unknown): Promise<import("@veritas/core").Result<unknown, import("@veritas/core").AppError>>;
  };
}

export const listWallets = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const query = listWalletsQuerySchema.parse(req.query);
  const pageRequest = toPageRequest({ cursor: query.cursor, limit: query.limit });
  const service = getWalletService(req);
  const result = await service.list({ ...query, ...pageRequest });
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  responder.page(res, result.value);
});

export const getWallet = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = getWalletParamsSchema.parse(req.params);
  const service = getWalletService(req);
  const result = await service.getById(id);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  responder.ok(res, result.value);
});

export const createWallet = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const body = createWalletBodySchema.parse(req.body);
  const service = getWalletService(req);
  const result = await service.create(body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  responder.created(res, result.value);
});

export const depositToWallet = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { id } = depositParamsSchema.parse(req.params);
  const body = depositBodySchema.parse(req.body);
  const service = getWalletService(req);
  const result = await service.deposit(id, body);
  if (isErr(result)) {
    throw toHttpError(result.error);
  }
  responder.ok(res, result.value);
});
