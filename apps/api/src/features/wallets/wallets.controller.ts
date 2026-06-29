// Wallets feature controller: validates requests, calls feature service, maps to HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import { asyncHandler } from "../../http/async-handler.js";
import { toHttpError } from "../../http/api-error.js";
import {
  respondOk,
  respondCreated,
  respondNoContent,
  respondPage,
} from "../../http/responder.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import {
  listWalletsQuerySchema,
  walletIdParamSchema,
  createWalletBodySchema,
  updateWalletBodySchema,
} from "./wallets.schema.js";
import { toWalletResponse } from "./wallets.mapper.js";
import type { WalletsFeatureService } from "./wallets.service.js";

export function makeWalletsController(service: WalletsFeatureService) {
  const listWallets = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listWalletsQuerySchema.parse(req.query);
      const result = await service.list(req as AuthenticatedRequest, query);
      if (isErr(result)) throw toHttpError(result.error);
      const page = {
        ...result.value,
        items: result.value.items.map(toWalletResponse),
      };
      respondPage(res, page);
    },
  );

  const getWallet = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = walletIdParamSchema.parse(req.params);
      const result = await service.getById(req as AuthenticatedRequest, id);
      if (isErr(result)) throw toHttpError(result.error);
      respondOk(res, toWalletResponse(result.value));
    },
  );

  const createWallet = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const body = createWalletBodySchema.parse(req.body);
      const result = await service.create(req as AuthenticatedRequest, body);
      if (isErr(result)) throw toHttpError(result.error);
      respondCreated(res, toWalletResponse(result.value));
    },
  );

  const updateWallet = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = walletIdParamSchema.parse(req.params);
      const body = updateWalletBodySchema.parse(req.body);
      const result = await service.update(req as AuthenticatedRequest, id, body);
      if (isErr(result)) throw toHttpError(result.error);
      respondOk(res, toWalletResponse(result.value));
    },
  );

  const deleteWallet = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = walletIdParamSchema.parse(req.params);
      const result = await service.delete(req as AuthenticatedRequest, id);
      if (isErr(result)) throw toHttpError(result.error);
      respondNoContent(res);
    },
  );

  return { listWallets, getWallet, createWallet, updateWallet, deleteWallet };
}
