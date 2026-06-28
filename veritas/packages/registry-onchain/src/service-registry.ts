// On-chain service registry port: interface for registering and querying CAP services

import type { Result } from "@veritas/core";
import type { EvmAddress } from "@veritas/blockchain";
import type { RegistryRecord, ServiceMetadata } from "./record.js";

/** Parameters to register a new service on-chain */
export interface RegisterServiceParams {
  readonly owner: EvmAddress;
  readonly metadataUri: string;
  readonly metadata: ServiceMetadata;
}

/** Parameters to update an existing service's on-chain record */
export interface UpdateServiceParams {
  readonly id: string;
  readonly metadataUri: string;
  readonly metadata: ServiceMetadata;
  readonly caller: EvmAddress;
}

/** Parameters to change a service's status on-chain */
export interface SetServiceStatusParams {
  readonly id: string;
  readonly status: "active" | "suspended" | "deregistered";
  readonly caller: EvmAddress;
}

/** Query filters for listing services from the registry */
export interface ServiceRegistryFilter {
  readonly owner?: EvmAddress;
  readonly status?: "active" | "suspended" | "deregistered";
  readonly slug?: string;
  readonly limit?: number;
  readonly afterId?: string;
}

/** Port interface for the on-chain service registry */
export interface ServiceRegistryPort {
  /** Register a new service, returning the new registry record */
  register(params: RegisterServiceParams): Promise<Result<RegistryRecord>>;

  /** Update an existing service's metadata */
  update(params: UpdateServiceParams): Promise<Result<RegistryRecord>>;

  /** Change the service's registry status */
  setStatus(params: SetServiceStatusParams): Promise<Result<RegistryRecord>>;

  /** Resolve a single service record by id */
  getById(id: string): Promise<Result<RegistryRecord>>;

  /** Resolve a single service record by slug */
  getBySlug(slug: string): Promise<Result<RegistryRecord | null>>;

  /** List services with optional filtering */
  list(filter?: ServiceRegistryFilter): Promise<Result<readonly RegistryRecord[]>>;
}
