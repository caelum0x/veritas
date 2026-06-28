// Shared type definitions for the @veritas/registry-onchain package

import { z } from "zod";
import type { EvmAddress } from "@veritas/blockchain";
import type { IsoTimestamp } from "@veritas/core";

/** On-chain registration status of an agent or service */
export type RegistrationStatus = "active" | "suspended" | "deregistered";

/** Discriminated kind for registry entries */
export type RegistryKind = "agent" | "service";

/** Unique on-chain registry identifier (uint256 as string) */
export type RegistryId = string;

/** On-chain agent registration record */
export interface AgentRegistration {
  readonly kind: "agent";
  readonly registryId: RegistryId;
  readonly walletAddress: EvmAddress;
  readonly metadataCid: string;
  readonly status: RegistrationStatus;
  readonly registeredAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly blockNumber: bigint;
  readonly txHash: string;
}

/** On-chain service registration record */
export interface ServiceRegistration {
  readonly kind: "service";
  readonly registryId: RegistryId;
  readonly ownerAddress: EvmAddress;
  readonly serviceSlug: string;
  readonly metadataCid: string;
  readonly status: RegistrationStatus;
  readonly registeredAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly blockNumber: bigint;
  readonly txHash: string;
}

/** Union of all registry record types */
export type RegistryRecord = AgentRegistration | ServiceRegistration;

/** Parameters to register an agent on-chain */
export interface RegisterAgentParams {
  readonly walletAddress: EvmAddress;
  readonly metadataCid: string;
}

/** Parameters to register a service on-chain */
export interface RegisterServiceParams {
  readonly ownerAddress: EvmAddress;
  readonly serviceSlug: string;
  readonly metadataCid: string;
}

/** Parameters to update registry status */
export interface UpdateStatusParams {
  readonly registryId: RegistryId;
  readonly status: RegistrationStatus;
}

/** Result of a registry write transaction */
export interface RegistryTxResult {
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly registryId: RegistryId;
}

/** Zod schema for RegistrationStatus */
export const registrationStatusSchema = z.enum(["active", "suspended", "deregistered"]);

/** Zod schema for RegistryKind */
export const registryKindSchema = z.enum(["agent", "service"]);

/** Options for querying registry records */
export interface RegistryQueryOptions {
  readonly kind?: RegistryKind;
  readonly status?: RegistrationStatus;
  readonly walletAddress?: EvmAddress;
  readonly limit?: number;
  readonly offset?: number;
}
