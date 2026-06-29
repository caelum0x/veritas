// Agents controller: validates requests, calls the feature service, sends HTTP responses.
import type { Request, Response } from "express";
import { sendOk, sendCreated, sendNoContent } from "../../http/responder.js";
import { unwrapResult } from "../../errors.js";
import { buildContext } from "../../context.js";
import { getValidated } from "../../middleware/validate.js";
import { toAgentResponse, toAgentListResponse } from "./agents.mapper.js";
import type { AgentsFeatureService } from "./agents.service.js";
import type {
  RegisterAgentBody,
  UpdateAgentBody,
  SetAgentTrustBody,
  AgentIdParam,
  ListAgentsQuery,
} from "./agents.schema.js";

export class AgentsController {
  constructor(private readonly svc: AgentsFeatureService) {}

  async register(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const body = getValidated<RegisterAgentBody>(req);
    const result = await this.svc.register(ctx, body);
    sendCreated(res, toAgentResponse(unwrapResult(result)));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const { agentId } = getValidated<AgentIdParam>(req);
    const result = await this.svc.getById(ctx, agentId);
    sendOk(res, toAgentResponse(unwrapResult(result)));
  }

  async list(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const query = getValidated<ListAgentsQuery>(req);
    const result = await this.svc.list(ctx, query);
    sendOk(res, toAgentListResponse(unwrapResult(result)));
  }

  async update(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const { agentId } = req.params as AgentIdParam;
    const body = getValidated<UpdateAgentBody>(req);
    const result = await this.svc.update(ctx, agentId, body);
    sendOk(res, toAgentResponse(unwrapResult(result)));
  }

  async setTrust(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const { agentId } = req.params as AgentIdParam;
    const body = getValidated<SetAgentTrustBody>(req);
    const result = await this.svc.setTrust(ctx, agentId, body);
    sendOk(res, toAgentResponse(unwrapResult(result)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const ctx = buildContext(req);
    const { agentId } = req.params as AgentIdParam;
    unwrapResult(await this.svc.delete(ctx, agentId));
    sendNoContent(res);
  }
}
