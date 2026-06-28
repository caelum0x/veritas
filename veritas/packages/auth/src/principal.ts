// Authenticated principal type representing an identified caller with scopes

import type { UserId } from "@veritas/core";
import type { Scope } from "./scopes.js";

export type PrincipalKind = "api_key" | "session" | "agent" | "service";

export interface Principal {
  readonly id: string;
  readonly kind: PrincipalKind;
  readonly userId: UserId | undefined;
  readonly orgId: string;
  readonly scopes: readonly Scope[];
  readonly metadata: Readonly<Record<string, string>>;
}

export interface ApiKeyPrincipal extends Principal {
  readonly kind: "api_key";
  readonly apiKeyId: string;
  readonly userId: UserId;
}

export interface SessionPrincipal extends Principal {
  readonly kind: "session";
  readonly sessionId: string;
  readonly userId: UserId;
}

export interface AgentPrincipal extends Principal {
  readonly kind: "agent";
  readonly agentId: string;
  readonly userId: undefined;
}

export interface ServicePrincipal extends Principal {
  readonly kind: "service";
  readonly serviceName: string;
  readonly userId: undefined;
}

export function makeApiKeyPrincipal(
  apiKeyId: string,
  userId: UserId,
  orgId: string,
  scopes: readonly Scope[],
  metadata: Readonly<Record<string, string>> = {}
): ApiKeyPrincipal {
  return {
    id: apiKeyId,
    kind: "api_key",
    apiKeyId,
    userId,
    orgId,
    scopes,
    metadata,
  };
}

export function makeSessionPrincipal(
  sessionId: string,
  userId: UserId,
  orgId: string,
  scopes: readonly Scope[],
  metadata: Readonly<Record<string, string>> = {}
): SessionPrincipal {
  return {
    id: sessionId,
    kind: "session",
    sessionId,
    userId,
    orgId,
    scopes,
    metadata,
  };
}

export function makeAgentPrincipal(
  agentId: string,
  orgId: string,
  scopes: readonly Scope[],
  metadata: Readonly<Record<string, string>> = {}
): AgentPrincipal {
  return {
    id: agentId,
    kind: "agent",
    agentId,
    userId: undefined,
    orgId,
    scopes,
    metadata,
  };
}

export function makeServicePrincipal(
  serviceName: string,
  orgId: string,
  scopes: readonly Scope[],
  metadata: Readonly<Record<string, string>> = {}
): ServicePrincipal {
  return {
    id: serviceName,
    kind: "service",
    serviceName,
    userId: undefined,
    orgId,
    scopes,
    metadata,
  };
}

export function isApiKeyPrincipal(p: Principal): p is ApiKeyPrincipal {
  return p.kind === "api_key";
}

export function isSessionPrincipal(p: Principal): p is SessionPrincipal {
  return p.kind === "session";
}

export function isAgentPrincipal(p: Principal): p is AgentPrincipal {
  return p.kind === "agent";
}

export function isServicePrincipal(p: Principal): p is ServicePrincipal {
  return p.kind === "service";
}
