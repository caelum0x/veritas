// v1 API Keys controller: issue, list, and revoke API keys scoped to the caller's organization.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { newId, epochToIso } from "@veritas/core";
import { makeServiceContext, type ApiKeyService } from "@veritas/services";
import type { Principal } from "@veritas/auth";
import { ApiError } from "../http/api-error.js";

type AuthedRequest = Request & { principal?: Principal };

const issueApiKeyBodySchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z.array(z.string().min(1)).default([]),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  description: z.string().max(512).optional(),
});

const listApiKeysQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function buildContext(req: AuthedRequest) {
  const principal = req.principal;
  if (!principal) throw ApiError.unauthorized();
  const requestId = newId("req");
  const now = epochToIso(Date.now());
  return {
    ctx: makeServiceContext(
      { userId: principal.userId ?? principal.id, orgId: principal.orgId, roles: [], apiKeyId: principal.kind === "api_key" ? principal.id : undefined },
      requestId,
      requestId,
      now,
    ),
    orgId: principal.orgId,
    userId: (principal.userId ?? principal.id) as string,
  };
}

export function makeApiKeysController(apiKeyService: ApiKeyService) {
  const issueApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId, userId } = buildContext(req as AuthedRequest);
      const parsed = issueApiKeyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid request body", parsed.error.flatten()));
        return;
      }
      const result = await apiKeyService.issueApiKey(ctx, {
        ...parsed.data,
        organizationId: orgId,
        userId,
      } as Parameters<typeof apiKeyService.issueApiKey>[1]);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const listApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const parsed = listApiKeysQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest("Invalid query parameters", parsed.error.flatten()));
        return;
      }
      const result = await apiKeyService.listApiKeys(ctx, { organizationId: orgId, ...parsed.data });
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      const out = result.value;
      res.status(200).json({
        success: true,
        data: out.items,
        meta: { nextCursor: out.nextCursor ?? null, hasMore: out.nextCursor !== null, total: out.total },
      });
    } catch (err) {
      next(err);
    }
  };

  const getApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const result = await apiKeyService.getApiKey(ctx, id);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  const revokeApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ctx, orgId } = buildContext(req as AuthedRequest);
      const id = req.params["id"];
      if (!id) { next(ApiError.badRequest("Missing id")); return; }
      const result = await apiKeyService.revokeApiKey(ctx, { keyId: id, orgId } as Parameters<typeof apiKeyService.revokeApiKey>[1]);
      if (!result.ok) {
        next(ApiError.fromServiceError(result.error));
        return;
      }
      res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  return { issueApiKey, listApiKeys, getApiKey, revokeApiKey };
}
