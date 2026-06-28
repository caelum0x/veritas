// Controller handlers for negotiation lifecycle operations.
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { respond } from "../http/responder.js";
import { toHttpError } from "../http/api-error.js";
import { toPageRequest } from "@veritas/core";
import { NotFoundError } from "@veritas/core";
import type {
  CreateNegotiationBody,
  UpdateNegotiationBody,
  ListNegotiationsQuery,
  NegotiationIdParam,
} from "../validators/negotiation.validator.js";

interface NegotiationService {
  create(data: CreateNegotiationBody): Promise<unknown>;
  findById(id: string): Promise<unknown>;
  list(req: ReturnType<typeof toPageRequest>, filters: Record<string, string | undefined>): Promise<unknown>;
  update(id: string, data: UpdateNegotiationBody): Promise<unknown>;
  cancel(id: string): Promise<unknown>;
  accept(id: string): Promise<unknown>;
  reject(id: string): Promise<unknown>;
}

function getNegotiationService(req: Request): NegotiationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).container.resolve("negotiationService") as NegotiationService;
}

export const createNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const svc = getNegotiationService(req);
    const result = await svc.create(req.body as CreateNegotiationBody);
    respond(res, 201, result);
  }
);

export const getNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const params = req.params as unknown as NegotiationIdParam;
    const svc = getNegotiationService(req);
    const result = await svc.findById(params.id);
    if (!result) {
      throw toHttpError(new NotFoundError({ message: `Negotiation ${params.id} not found` }));
    }
    respond(res, 200, result);
  }
);

export const listNegotiations = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const svc = getNegotiationService(req);
    const query = req.query as unknown as ListNegotiationsQuery;
    const { status, orderId, agentId, ...pagination } = query;
    const pageReq = toPageRequest(pagination);
    const result = await svc.list(pageReq, { status, orderId, agentId });
    respond(res, 200, result);
  }
);

export const updateNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const params = req.params as unknown as NegotiationIdParam;
    const svc = getNegotiationService(req);
    const result = await svc.update(params.id, req.body as UpdateNegotiationBody);
    respond(res, 200, result);
  }
);

export const cancelNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const params = req.params as unknown as NegotiationIdParam;
    const svc = getNegotiationService(req);
    const result = await svc.cancel(params.id);
    respond(res, 200, result);
  }
);

export const acceptNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const params = req.params as unknown as NegotiationIdParam;
    const svc = getNegotiationService(req);
    const result = await svc.accept(params.id);
    respond(res, 200, result);
  }
);

export const rejectNegotiation = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const params = req.params as unknown as NegotiationIdParam;
    const svc = getNegotiationService(req);
    const result = await svc.reject(params.id);
    respond(res, 200, result);
  }
);
