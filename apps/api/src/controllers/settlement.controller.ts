// Settlement controller: handles USDC settlement creation, lookup, and status updates.
import type { Request, Response, NextFunction } from "express";
import { isErr, type AppError } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import {
  CreateSettlementBodySchema,
  UpdateSettlementBodySchema,
  ListSettlementsQuerySchema,
} from "../validators/settlement.validator.js";
import type { Result, Err } from "@veritas/core";

type ServiceResult = Result<unknown, AppError>;

function getSettlementService(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container?.settlementService as {
    createSettlement: (data: unknown) => Promise<ServiceResult>;
    getSettlement: (id: string) => Promise<ServiceResult>;
    updateSettlement: (id: string, data: unknown) => Promise<ServiceResult>;
    listSettlements: (query: unknown) => Promise<ServiceResult>;
    confirmSettlement: (id: string, txHash: string) => Promise<ServiceResult>;
  };
}

function handleError(res: Response, result: Err<AppError>): void {
  const httpError = toHttpError(result.error);
  respondError(res, httpError.statusCode, httpError.code, httpError.message, httpError.fields);
}

export const createSettlement = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = CreateSettlementBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const service = getSettlementService(req);
  const result = await service.createSettlement(parsed.data);
  if (isErr(result)) {
    return handleError(res, result);
  }
  return respondCreated(res, result.value);
});

export const getSettlement = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params["id"] ?? "";
  const service = getSettlementService(req);
  const result = await service.getSettlement(id);
  if (isErr(result)) {
    return handleError(res, result);
  }
  return respondOk(res, result.value);
});

export const updateSettlement = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params["id"] ?? "";
  const parsed = UpdateSettlementBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const service = getSettlementService(req);
  const result = await service.updateSettlement(id, parsed.data);
  if (isErr(result)) {
    return handleError(res, result);
  }
  return respondOk(res, result.value);
});

export const listSettlements = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = ListSettlementsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return respondError(res, 400, "VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const service = getSettlementService(req);
  const result = await service.listSettlements(parsed.data);
  if (isErr(result)) {
    return handleError(res, result);
  }
  return respondOk(res, result.value);
});

export const confirmSettlement = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const id = req.params["id"] ?? "";
  const { txHash } = req.body as { txHash?: unknown };
  if (typeof txHash !== "string" || txHash.trim() === "") {
    return respondError(res, 400, "VALIDATION_ERROR", "txHash is required");
  }
  const service = getSettlementService(req);
  const result = await service.confirmSettlement(id, txHash);
  if (isErr(result)) {
    return handleError(res, result);
  }
  return respondOk(res, result.value);
});
