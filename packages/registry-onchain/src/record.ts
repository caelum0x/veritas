// Registry record: canonical shape for an on-chain agent or service registry entry

import { z } from "zod";
import type { EvmAddress } from "@veritas/blockchain";
import type { IsoTimestamp } from "@veritas/core";

/** Status of a registry entry on-chain */
export type RegistryStatus = "active" | "suspended" | "deregistered";

/** Discriminator for the kind of registry entry */
export type RegistryKind = "agent" | "service";

/** Immutable on-chain registry record as returned from contract state */
export interface RegistryRecord {
  readonly id: string;
  readonly kind: RegistryKind;
  readonly owner: EvmAddress;
  readonly metadataUri: string;
  readonly status: RegistryStatus;
  readonly registeredAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly blockNumber: bigint;
  readonly txHash: string;
}

/** Parsed agent metadata stored at metadataUri */
export interface AgentMetadata {
  readonly name: string;
  readonly endpoint: string | null;
  readonly publicKey: string | null;
  readonly capabilities: readonly string[];
  readonly version: string;
}

/** Parsed service metadata stored at metadataUri */
export interface ServiceMetadata {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchemaRef: string | null;
  readonly outputSchemaRef: string | null;
  readonly version: string;
}

export const RegistryStatusSchema = z.enum(["active", "suspended", "deregistered"]);
export const RegistryKindSchema = z.enum(["agent", "service"]);

export const AgentMetadataSchema = z.object({
  name: z.string().min(1),
  endpoint: z.string().url().nullable(),
  publicKey: z.string().nullable(),
  capabilities: z.array(z.string()),
  version: z.string(),
});

export const ServiceMetadataSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputSchemaRef: z.string().nullable(),
  outputSchemaRef: z.string().nullable(),
  version: z.string(),
});

/** Build a registry record from raw on-chain data */
export function makeRegistryRecord(
  id: string,
  kind: RegistryKind,
  owner: EvmAddress,
  metadataUri: string,
  status: RegistryStatus,
  registeredAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
  blockNumber: bigint,
  txHash: string
): RegistryRecord {
  return Object.freeze({
    id,
    kind,
    owner,
    metadataUri,
    status,
    registeredAt,
    updatedAt,
    blockNumber,
    txHash,
  });
}
