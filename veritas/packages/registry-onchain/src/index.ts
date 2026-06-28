// Public surface re-export for @veritas/registry-onchain

// agent-registry: exclude names that conflict with types.ts
export type {
  UpdateAgentParams,
  SetAgentStatusParams,
  AgentRegistryFilter,
  AgentRegistryPort,
} from "./agent-registry.js";

// service-registry: exclude names that conflict with types.ts
export type {
  UpdateServiceParams,
  SetServiceStatusParams,
  ServiceRegistryFilter,
  ServiceRegistryPort,
} from "./service-registry.js";

export * from "./reader.js";
export * from "./writer.js";

// record.ts: exclude RegistryKind and RegistryRecord which are superseded by types.ts
export {
  RegistryStatusSchema,
  RegistryKindSchema,
  AgentMetadataSchema,
  ServiceMetadataSchema,
  makeRegistryRecord,
} from "./record.js";
export type {
  RegistryStatus,
  AgentMetadata,
  ServiceMetadata,
} from "./record.js";

export * from "./mock-registry.js";
export * from "./sync.js";
export * from "./events.js";
export * from "./errors.js";

// types.ts is authoritative for RegistryKind, RegistryRecord, RegisterAgentParams, RegisterServiceParams
export * from "./types.js";
