// Admin controller for agent management — CRUD + activation lifecycle
import type { Request, Response, NextFunction } from "express";
import { sendPage, sendOk, sendCreated, sendNoContent } from "../http/responder.js";
import { HttpError } from "../http/api-error.js";
import {
  listAgentsQuerySchema,
  getAgentParamsSchema,
  createAgentBodySchema,
  updateAgentBodySchema,
  deleteAgentParamsSchema,
} from "../validators/agent.validator.js";

function getAgentService(req: Request) {
  const svc = (req as unknown as Record<string, unknown>)["agentService"];
  if (!svc) throw new HttpError(503, "UNAVAILABLE", "Agent service not available");
  return svc as {
    listAgents(opts: unknown): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
    getAgentById(id: string): Promise<unknown | null>;
    createAgent(data: unknown): Promise<unknown>;
    updateAgent(id: string, data: unknown): Promise<unknown | null>;
    deleteAgent(id: string): Promise<boolean>;
    activateAgent(id: string): Promise<unknown | null>;
    deactivateAgent(id: string): Promise<unknown | null>;
  };
}

export async function listAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listAgentsQuerySchema.safeParse(req.query);
    if (!query.success) throw new HttpError(422, "VALIDATION", "Invalid query parameters");
    const svc = getAgentService(req);
    const result = await svc.listAgents(query.data);
    sendPage(res, result.items as readonly unknown[], {
      total: result.total,
      nextCursor: null,
      hasMore: false,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = getAgentParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const svc = getAgentService(req);
    const agent = await svc.getAgentById(params.data.agentId);
    if (agent === null || agent === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Agent ${params.data.agentId} not found`);
    }
    sendOk(res, agent);
  } catch (err) {
    next(err);
  }
}

export async function createAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createAgentBodySchema.safeParse(req.body);
    if (!body.success) throw new HttpError(422, "VALIDATION", "Invalid request body");
    const svc = getAgentService(req);
    const agent = await svc.createAgent(body.data);
    sendCreated(res, agent);
  } catch (err) {
    next(err);
  }
}

export async function updateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = getAgentParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const body = updateAgentBodySchema.safeParse(req.body);
    if (!body.success) throw new HttpError(422, "VALIDATION", "Invalid request body");
    const svc = getAgentService(req);
    const agent = await svc.updateAgent(params.data.agentId, body.data);
    if (agent === null || agent === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Agent ${params.data.agentId} not found`);
    }
    sendOk(res, agent);
  } catch (err) {
    next(err);
  }
}

export async function deleteAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = deleteAgentParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const svc = getAgentService(req);
    const deleted = await svc.deleteAgent(params.data.agentId);
    if (!deleted) throw new HttpError(404, "NOT_FOUND", `Agent ${params.data.agentId} not found`);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function activateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = getAgentParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const svc = getAgentService(req);
    const agent = await svc.activateAgent(params.data.agentId);
    if (agent === null || agent === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Agent ${params.data.agentId} not found`);
    }
    sendOk(res, agent);
  } catch (err) {
    next(err);
  }
}

export async function deactivateAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = getAgentParamsSchema.safeParse(req.params);
    if (!params.success) throw new HttpError(422, "VALIDATION", "Invalid parameters");
    const svc = getAgentService(req);
    const agent = await svc.deactivateAgent(params.data.agentId);
    if (agent === null || agent === undefined) {
      throw new HttpError(404, "NOT_FOUND", `Agent ${params.data.agentId} not found`);
    }
    sendOk(res, agent);
  } catch (err) {
    next(err);
  }
}
