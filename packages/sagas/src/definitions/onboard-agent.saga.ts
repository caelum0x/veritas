// OnboardAgent saga: provisions identity, wallet, API key, and profile for a new agent.
import { ok, err, type Result } from "@veritas/core";
import type { SagaContext } from "../context.js";
import type { SagaStep } from "../step.js";
import type { Saga } from "../saga.js";

export interface OnboardAgentInput {
  readonly agentId: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly serviceIds: readonly string[];
}

export interface OnboardAgentOutput {
  readonly agentId: string;
  readonly walletAddress: string;
  readonly apiKeyId: string;
}

// Port interfaces modelling external subsystems.
export interface AgentRegistryPort {
  register(agentId: string, ownerUserId: string, name: string, ctx: SagaContext): Promise<void>;
  deregister(agentId: string, ctx: SagaContext): Promise<void>;
}

export interface WalletProvisionPort {
  createWallet(agentId: string, ctx: SagaContext): Promise<{ address: string; walletId: string }>;
  deleteWallet(walletId: string, ctx: SagaContext): Promise<void>;
}

export interface ApiKeyProvisionPort {
  issueKey(agentId: string, ctx: SagaContext): Promise<{ apiKeyId: string; secret: string }>;
  revokeKey(apiKeyId: string, ctx: SagaContext): Promise<void>;
}

export interface ServiceBindingPort {
  bindServices(agentId: string, serviceIds: readonly string[], ctx: SagaContext): Promise<void>;
  unbindServices(agentId: string, serviceIds: readonly string[], ctx: SagaContext): Promise<void>;
}

export interface OnboardAgentPorts {
  readonly registry: AgentRegistryPort;
  readonly wallet: WalletProvisionPort;
  readonly apiKey: ApiKeyProvisionPort;
  readonly serviceBinding: ServiceBindingPort;
}

function registerAgentStep(ports: OnboardAgentPorts): SagaStep<OnboardAgentInput, Record<string, never>> {
  return {
    name: "registerAgent",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      await ports.registry.register(input.agentId, input.ownerUserId, input.name, ctx);
      return ok({} as Record<string, never>);
    },
    async compensate(input, ctx) {
      await ports.registry.deregister(input.agentId, ctx);
    },
  };
}

function createWalletStep(ports: OnboardAgentPorts): SagaStep<OnboardAgentInput, { address: string; walletId: string }> {
  return {
    name: "createWallet",
    async execute(input, ctx) {
      const result = await ports.wallet.createWallet(input.agentId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const walletId = ctx.data["walletId"] as string | undefined;
      if (walletId) {
        await ports.wallet.deleteWallet(walletId, ctx);
      }
    },
  };
}

function issueApiKeyStep(ports: OnboardAgentPorts): SagaStep<OnboardAgentInput, { apiKeyId: string; secret: string }> {
  return {
    name: "issueApiKey",
    async execute(input, ctx) {
      const result = await ports.apiKey.issueKey(input.agentId, ctx);
      return ok(result);
    },
    async compensate(input, ctx) {
      const apiKeyId = ctx.data["apiKeyId"] as string | undefined;
      if (apiKeyId) {
        await ports.apiKey.revokeKey(apiKeyId, ctx);
      }
    },
  };
}

function bindServicesStep(ports: OnboardAgentPorts): SagaStep<OnboardAgentInput, Record<string, never>> {
  return {
    name: "bindServices",
    async execute(input, ctx): Promise<Result<Record<string, never>>> {
      await ports.serviceBinding.bindServices(input.agentId, input.serviceIds, ctx);
      return ok({} as Record<string, never>);
    },
    async compensate(input, ctx) {
      await ports.serviceBinding.unbindServices(input.agentId, input.serviceIds, ctx);
    },
  };
}

export function onboardAgentSaga(ports: OnboardAgentPorts): Saga<OnboardAgentInput, OnboardAgentOutput> {
  return {
    name: "OnboardAgent",
    steps: [
      registerAgentStep(ports),
      createWalletStep(ports),
      issueApiKeyStep(ports),
      bindServicesStep(ports),
    ],
    buildOutput(input, data): Result<OnboardAgentOutput> {
      const walletAddress = data["address"] as string | undefined;
      const apiKeyId = data["apiKeyId"] as string | undefined;
      if (!walletAddress || !apiKeyId) {
        return err(new Error("Missing walletAddress or apiKeyId in saga output"));
      }
      return ok({ agentId: input.agentId, walletAddress, apiKeyId });
    },
  };
}
