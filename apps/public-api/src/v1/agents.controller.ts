// v1 Agents controller: CRUD handlers for registered CAP agents.
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { epochToIso, apiPage, isErr, type Id } from "@veritas/core";
import { makeServiceContext, type AgentService, type ServiceContext } from "@veritas/services";
import { CreateAgentSchema, UpdateAgentSchema } from "@veritas/contracts";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { respondOk, respondCreated, respondNoContent, respondError } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";

const listAgentsQuerySchema = z.object({
  trusted: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  walletAddress: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const agentIdParamSchema = z.object({
  id: z.string().min(1),
});

function toId(value: string): Id<string> {
  return value as Id<string>;
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

function buildContext(req: Request): ServiceContext {
  const authed = req as AuthenticatedRequest;
  const reqId = (req as Request & { requestId?: string }).requestId ?? "unknown";
  return makeServiceContext(
    {
      userId: toId(authed.userId ?? "anonymous"),
      orgId: authed.orgId ? toId(authed.orgId) : undefined,
      roles: authed.scopes ?? [],
      apiKeyId: authed.apiKeyId ? toId(authed.apiKeyId) : undefined,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export function makeAgentsController(agentService: AgentService) {
  const listAgents = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const query = listAgentsQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await agentService.list(ctx, {
        trusted: query.trusted,
        walletAddress: query.walletAddress,
        cursor: query.cursor,
        limit: query.limit ?? 20,
      });
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      const page = result.value;
      res.status(200).json(
        apiPage(page.items, {
          nextCursor: page.nextCursor ?? null,
          hasMore: page.nextCursor !== null,
        }),
      );
    },
  );

  const getAgent = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = agentIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await agentService.getById(ctx, id);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const registerAgent = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const body = CreateAgentSchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await agentService.register(ctx, body);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondCreated(res, result.value);
    },
  );

  const updateAgent = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = agentIdParamSchema.parse(req.params);
      const body = UpdateAgentSchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await agentService.update(ctx, id, body);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondOk(res, result.value);
    },
  );

  const deleteAgent = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = agentIdParamSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await agentService.delete(ctx, id);
      if (isErr(result)) {
        const httpErr = toHttpError(result.error);
        respondError(res, httpErr.statusCode, httpErr.code, httpErr.message, httpErr.fields);
        return;
      }
      respondNoContent(res);
    },
  );

  return { listAgents, getAgent, registerAgent, updateAgent, deleteAgent };
}
