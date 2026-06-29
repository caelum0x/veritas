// Domain events for the Agent aggregate lifecycle.

export const AGENT_REGISTERED = "AgentRegistered" as const;
export const AGENT_ENDPOINT_UPDATED = "AgentEndpointUpdated" as const;
export const AGENT_PUBLIC_KEY_UPDATED = "AgentPublicKeyUpdated" as const;
export const AGENT_TRUSTED = "AgentTrusted" as const;
export const AGENT_UNTRUSTED = "AgentUntrusted" as const;
export const AGENT_METADATA_UPDATED = "AgentMetadataUpdated" as const;
export const AGENT_DEACTIVATED = "AgentDeactivated" as const;

export type AgentEventType =
  | typeof AGENT_REGISTERED
  | typeof AGENT_ENDPOINT_UPDATED
  | typeof AGENT_PUBLIC_KEY_UPDATED
  | typeof AGENT_TRUSTED
  | typeof AGENT_UNTRUSTED
  | typeof AGENT_METADATA_UPDATED
  | typeof AGENT_DEACTIVATED;

export interface AgentRegisteredPayload {
  readonly agentId: string;
  readonly name: string;
  readonly walletAddress: string;
  readonly endpoint: string | null;
  readonly publicKey: string | null;
  readonly trusted: boolean;
  readonly metadata: Record<string, unknown>;
}

export interface AgentEndpointUpdatedPayload {
  readonly endpoint: string | null;
}

export interface AgentPublicKeyUpdatedPayload {
  readonly publicKey: string | null;
}

export interface AgentTrustedPayload {
  readonly trustedAt: string;
}

export interface AgentUntrustedPayload {
  readonly untrustedAt: string;
}

export interface AgentMetadataUpdatedPayload {
  readonly metadata: Record<string, unknown>;
}

export interface AgentDeactivatedPayload {
  readonly reason: string;
  readonly deactivatedAt: string;
}

export type AgentEventPayload =
  | { type: typeof AGENT_REGISTERED; data: AgentRegisteredPayload }
  | { type: typeof AGENT_ENDPOINT_UPDATED; data: AgentEndpointUpdatedPayload }
  | { type: typeof AGENT_PUBLIC_KEY_UPDATED; data: AgentPublicKeyUpdatedPayload }
  | { type: typeof AGENT_TRUSTED; data: AgentTrustedPayload }
  | { type: typeof AGENT_UNTRUSTED; data: AgentUntrustedPayload }
  | { type: typeof AGENT_METADATA_UPDATED; data: AgentMetadataUpdatedPayload }
  | { type: typeof AGENT_DEACTIVATED; data: AgentDeactivatedPayload };
