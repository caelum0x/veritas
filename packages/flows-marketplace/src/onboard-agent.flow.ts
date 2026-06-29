// Flow: onboard a new agent — identity creation → on-chain registry → reputation init.

import {
  type Result,
  ok,
  err,
  newId,
  epochToIso,
  type EventBus,
  type Logger,
  noopLogger,
} from "@veritas/core";
import type { IdentityRegistryPort, RegisterIdentityOptions } from "@veritas/identity";
import type { AgentRegistryPort } from "@veritas/registry-onchain";
import type { AgentMetadata } from "@veritas/registry-onchain";
import type { ReputationPort } from "./deps.js";
import {
  type AgentOnboardedPayload,
  makeAgentOnboardedEvent,
} from "./events.js";
import { AgentOnboardingError } from "./errors.js";

export interface OnboardAgentInput {
  readonly did: string;
  readonly displayName?: string;
  readonly publicKeyHex: string;
  /** EVM wallet address (hex with 0x prefix) that owns the agent on-chain. */
  readonly walletAddress: string;
  readonly metadataUri: string;
  readonly agentName: string;
  readonly agentEndpoint?: string;
  readonly capabilities?: readonly string[];
}

export interface OnboardAgentOutput {
  readonly agentIdentityId: string;
  readonly did: string;
  readonly registryId: string;
  readonly initialPts: number;
}

export interface OnboardAgentFlowDeps {
  readonly identityRegistry: IdentityRegistryPort;
  readonly agentRegistry: AgentRegistryPort;
  readonly reputation: ReputationPort;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Onboard a new agent: create identity, register on-chain, initialise reputation. */
export async function onboardAgentFlow(
  input: OnboardAgentInput,
  deps: OnboardAgentFlowDeps,
): Promise<Result<OnboardAgentOutput>> {
  const log = deps.logger ?? noopLogger;

  // Step 1: create agent identity in identity registry
  const identityOpts: RegisterIdentityOptions = {
    did: input.did as Parameters<IdentityRegistryPort["register"]>[0]["did"],
    displayName: input.displayName,
    initialKey: {
      keyId: newId("key"),
      algorithm: "Ed25519",
      publicKeyHex: input.publicKeyHex,
      createdAt: epochToIso(Date.now()),
      isCurrent: true,
    },
  };

  const identityResult = await deps.identityRegistry.register(identityOpts);
  if (!identityResult.ok) {
    log.error("onboard-agent: identity creation failed", { did: input.did });
    return err(
      new AgentOnboardingError(`Identity registration failed for DID ${input.did}`, {
        cause: identityResult.error,
      }),
    );
  }
  const identity = identityResult.value;
  log.info("onboard-agent: identity created", { identityId: identity.id, did: identity.did });

  // Step 2: register agent on-chain
  const agentMeta: AgentMetadata = {
    name: input.agentName,
    endpoint: input.agentEndpoint ?? null,
    publicKey: input.publicKeyHex,
    capabilities: input.capabilities ?? [],
    version: "1.0.0",
  };
  const registryResult = await deps.agentRegistry.register({
    owner: input.walletAddress as Parameters<AgentRegistryPort["register"]>[0]["owner"],
    metadataUri: input.metadataUri,
    metadata: agentMeta,
  });
  if (!registryResult.ok) {
    log.error("onboard-agent: on-chain registration failed", { did: input.did });
    return err(
      new AgentOnboardingError(`On-chain registration failed for DID ${input.did}`, {
        cause: registryResult.error,
      }),
    );
  }
  const registryRecord = registryResult.value;
  log.info("onboard-agent: registered on-chain", { registryId: registryRecord.id });

  // Step 3: initialise reputation score
  const initResult = await deps.reputation.initScore(identity.id);
  if (!initResult.ok) {
    log.error("onboard-agent: reputation init failed", { agentId: identity.id });
    return err(
      new AgentOnboardingError(`Reputation init failed for agent ${identity.id}`, {
        cause: initResult.error,
      }),
    );
  }
  const initialPts = initResult.value;
  log.info("onboard-agent: reputation initialised", { agentId: identity.id, pts: initialPts });

  // Step 4: emit domain event
  if (deps.eventBus) {
    const payload: AgentOnboardedPayload = {
      agentId: identity.id,
      did: identity.did,
      registryId: registryRecord.id,
    };
    deps.eventBus.publish(makeAgentOnboardedEvent(payload));
  }

  return ok({
    agentIdentityId: identity.id,
    did: identity.did,
    registryId: registryRecord.id,
    initialPts,
  });
}
