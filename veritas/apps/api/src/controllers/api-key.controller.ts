// API key controller handlers: list, create, get, revoke
import type { Request, Response, NextFunction } from "express";
import { isErr, type AppError, type Result } from "@veritas/core";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondCreated, respondNoContent, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import { validateBody, validateQuery, validateParams } from "../middleware/validate.js";
import {
  createApiKeyBodySchema,
  listApiKeysQuerySchema,
  apiKeyIdParamSchema,
} from "../validators/api-key.validator.js";

type ServiceResult = Result<unknown, AppError>;

interface ApiKeyService {
  listByOrg(opts: {
    orgId: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }): Promise<ServiceResult>;
  create(data: Record<string, unknown>): Promise<ServiceResult>;
  getById(id: string): Promise<ServiceResult>;
  revoke(id: string, userId: string): Promise<ServiceResult>;
}

function getApiKeyService(req: Request): ApiKeyService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).app.locals.container?.apiKeyService as ApiKeyService;
}

function getAuth(req: Request): { orgId: string; userId: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((req as any).auth ?? { orgId: "", userId: "" }) as { orgId: string; userId: string };
}

function handleError(res: Response, error: AppError): void {
  const httpError = toHttpError(error);
  respondError(res, httpError.statusCode, httpError.code, httpError.message, httpError.fields);
}

export const listApiKeysHandler = [
  validateQuery(listApiKeysQuerySchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const apiKeyService = getApiKeyService(req);
    const auth = getAuth(req);
    const { page, limit, cursor } = req.query as Record<string, string | undefined>;

    const result = await apiKeyService.listByOrg({
      orgId: auth.orgId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondOk(res, result.value);
  }),
];

export const createApiKeyHandler = [
  validateBody(createApiKeyBodySchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const apiKeyService = getApiKeyService(req);
    const auth = getAuth(req);

    const result = await apiKeyService.create({
      ...(req.body as Record<string, unknown>),
      orgId: auth.orgId,
      createdBy: auth.userId,
    });

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondCreated(res, result.value);
  }),
];

export const getApiKeyHandler = [
  validateParams(apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const apiKeyService = getApiKeyService(req);

    const result = await apiKeyService.getById(req.params["id"] ?? "");

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondOk(res, result.value);
  }),
];

export const revokeApiKeyHandler = [
  validateParams(apiKeyIdParamSchema),
  asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const apiKeyService = getApiKeyService(req);
    const auth = getAuth(req);

    const result = await apiKeyService.revoke(req.params["id"] ?? "", auth.userId);

    if (isErr(result)) {
      return handleError(res, result.error);
    }
    return respondNoContent(res);
  }),
];
