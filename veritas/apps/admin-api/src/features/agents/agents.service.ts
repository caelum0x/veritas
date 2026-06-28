// Agents feature service: delegates all agent management to the @veritas/services AgentService.
import type { Deps } from "../../container.js";
import type { ServiceContext } from "@veritas/services";
import type { Result } from "@veritas/services";
import type { AppError } from "@veritas/services";
import type { AgentOutput, AgentListOutput } from "@veritas/services";
import type {
  RegisterAgentBody,
  UpdateAgentBody,
  SetAgentTrustBody,
  ListAgentsQuery,
} from "./agents.schema.js";

export class AgentsFeatureService {
  private readonly agentService: Deps["agentService"];
  private readonly logger: Deps["logger"];

  constructor(deps: Pick<Deps, "agentService" | "logger">) {
    this.agentService = deps.agentService;
    this.logger = deps.logger;
  }

  async register(
    ctx: ServiceContext,
    body: RegisterAgentBody,
  ): Promise<Result<AgentOutput, AppError>> {
    this.logger.info("agents.feature: register", { walletAddress: body.walletAddress });
    return this.agentService.register(ctx, body);
  }

  async getById(
    ctx: ServiceContext,
    agentId: string,
  ): Promise<Result<AgentOutput, AppError>> {
    return this.agentService.getById(ctx, agentId);
  }

  async list(
    ctx: ServiceContext,
    query: ListAgentsQuery,
  ): Promise<Result<AgentListOutput, AppError>> {
    return this.agentService.list(ctx, {
      trusted: query.trusted,
      walletAddress: query.walletAddress,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  async update(
    ctx: ServiceContext,
    agentId: string,
    body: UpdateAgentBody,
  ): Promise<Result<AgentOutput, AppError>> {
    this.logger.info("agents.feature: update", { agentId });
    return this.agentService.update(ctx, agentId, body);
  }

  async setTrust(
    ctx: ServiceContext,
    agentId: string,
    body: SetAgentTrustBody,
  ): Promise<Result<AgentOutput, AppError>> {
    this.logger.info("agents.feature: setTrust", { agentId, trusted: body.trusted });
    return this.agentService.setTrust(ctx, { agentId, trusted: body.trusted });
  }

  async delete(
    ctx: ServiceContext,
    agentId: string,
  ): Promise<Result<void, AppError>> {
    this.logger.info("agents.feature: delete", { agentId });
    return this.agentService.delete(ctx, agentId);
  }
}
