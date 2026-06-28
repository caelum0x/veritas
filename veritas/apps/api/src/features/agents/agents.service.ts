// Agents feature service: delegates agent CRUD and trust management to @veritas/services AgentService.
import { isErr, epochToIso, newId, type Result } from "@veritas/core";
import {
  AgentService,
  makeServiceContext,
  type RegisterAgentInput,
  type UpdateAgentInput,
  type ListAgentsInput,
  type AgentOutput,
  type AgentListOutput,
  type SetAgentTrustInput,
} from "@veritas/services";
import type { Container } from "@veritas/container";
import { AGENT_SVC, LOGGER } from "@veritas/container/tokens";
import type { Logger } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

/** Subset of Container used by the agents feature. */
export interface AgentsDeps {
  readonly agentService: AgentService;
  readonly logger: Logger;
}

/** Resolve agent dependencies from the DI container. */
export function resolveAgentsDeps(container: Container): AgentsDeps {
  return {
    agentService: container.resolve(AGENT_SVC) as AgentService,
    logger: container.resolve(LOGGER) as Logger,
  };
}

/** Build a ServiceContext from an authenticated HTTP request. */
function makeCtx(req: AuthenticatedRequest) {
  const reqId = newId("req");
  return makeServiceContext(
    {
      userId: req.userId ?? "anonymous",
      orgId: req.orgId,
      roles: req.scopes ?? [],
      apiKeyId: req.apiKeyId,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

/** Register a new CAP agent. */
export async function registerAgent(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  input: RegisterAgentInput,
): Promise<Result<AgentOutput>> {
  const ctx = makeCtx(req);
  return deps.agentService.register(ctx, input);
}

/** Retrieve a single agent by ID. */
export async function getAgentById(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  agentId: string,
): Promise<Result<AgentOutput>> {
  const ctx = makeCtx(req);
  return deps.agentService.getById(ctx, agentId);
}

/** List agents with optional filters and pagination. */
export async function listAgents(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  input: ListAgentsInput,
): Promise<Result<AgentListOutput>> {
  const ctx = makeCtx(req);
  return deps.agentService.list(ctx, input);
}

/** Apply a partial update to an existing agent record. */
export async function updateAgent(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  agentId: string,
  input: UpdateAgentInput,
): Promise<Result<AgentOutput>> {
  const ctx = makeCtx(req);
  return deps.agentService.update(ctx, agentId, input);
}

/** Set the trusted flag on an agent. */
export async function setAgentTrust(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  input: SetAgentTrustInput,
): Promise<Result<AgentOutput>> {
  const ctx = makeCtx(req);
  return deps.agentService.setTrust(ctx, input);
}

/** Remove an agent registration. */
export async function deleteAgent(
  deps: AgentsDeps,
  req: AuthenticatedRequest,
  agentId: string,
): Promise<Result<void>> {
  const ctx = makeCtx(req);
  return deps.agentService.delete(ctx, agentId);
}
