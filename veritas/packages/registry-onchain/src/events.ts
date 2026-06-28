// Domain events emitted by the on-chain registry module

import { makeDomainEvent, type DomainEvent } from "@veritas/core";
import type { RegistrationStatus, RegistryId, RegistryKind } from "./types.js";

/** Payload for AgentRegistered event */
export interface AgentRegisteredPayload {
  readonly registryId: RegistryId;
  readonly walletAddress: string;
  readonly metadataCid: string;
  readonly txHash: string;
  readonly blockNumber: string;
}

/** Payload for ServiceRegistered event */
export interface ServiceRegisteredPayload {
  readonly registryId: RegistryId;
  readonly ownerAddress: string;
  readonly serviceSlug: string;
  readonly metadataCid: string;
  readonly txHash: string;
  readonly blockNumber: string;
}

/** Payload for RegistryStatusChanged event */
export interface RegistryStatusChangedPayload {
  readonly registryId: RegistryId;
  readonly kind: RegistryKind;
  readonly previousStatus: RegistrationStatus;
  readonly newStatus: RegistrationStatus;
  readonly txHash: string;
  readonly blockNumber: string;
}

/** Payload for RegistrySynced event */
export interface RegistrySyncedPayload {
  readonly fromBlock: string;
  readonly toBlock: string;
  readonly agentsSynced: number;
  readonly servicesSynced: number;
  readonly syncedAt: string;
}

/** Emitted when a new agent is registered on-chain */
export type AgentRegisteredEvent = DomainEvent<"registry.agent.registered", AgentRegisteredPayload>;

/** Emitted when a new service is registered on-chain */
export type ServiceRegisteredEvent = DomainEvent<"registry.service.registered", ServiceRegisteredPayload>;

/** Emitted when the status of a registry entry changes */
export type RegistryStatusChangedEvent = DomainEvent<"registry.status.changed", RegistryStatusChangedPayload>;

/** Emitted after a successful on-chain sync pass */
export type RegistrySyncedEvent = DomainEvent<"registry.synced", RegistrySyncedPayload>;

/** Union of all registry domain events */
export type RegistryEvent =
  | AgentRegisteredEvent
  | ServiceRegisteredEvent
  | RegistryStatusChangedEvent
  | RegistrySyncedEvent;

/** Factory: create an AgentRegisteredEvent */
export function makeAgentRegisteredEvent(
  payload: AgentRegisteredPayload,
  correlationId?: string
): AgentRegisteredEvent {
  return makeDomainEvent({ type: "registry.agent.registered", payload, correlationId });
}

/** Factory: create a ServiceRegisteredEvent */
export function makeServiceRegisteredEvent(
  payload: ServiceRegisteredPayload,
  correlationId?: string
): ServiceRegisteredEvent {
  return makeDomainEvent({ type: "registry.service.registered", payload, correlationId });
}

/** Factory: create a RegistryStatusChangedEvent */
export function makeRegistryStatusChangedEvent(
  payload: RegistryStatusChangedPayload,
  correlationId?: string
): RegistryStatusChangedEvent {
  return makeDomainEvent({ type: "registry.status.changed", payload, correlationId });
}

/** Factory: create a RegistrySyncedEvent */
export function makeRegistrySyncedEvent(
  payload: RegistrySyncedPayload,
  correlationId?: string
): RegistrySyncedEvent {
  return makeDomainEvent({ type: "registry.synced", payload, correlationId });
}
