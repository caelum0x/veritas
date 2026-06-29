// In-memory mock implementation of agent and service registry ports

import { ok, err, epochToIso, type Result } from "@veritas/core";
import type { EvmAddress } from "@veritas/blockchain";
import type {
  AgentRegistration,
  ServiceRegistration,
  RegisterAgentParams,
  RegisterServiceParams,
  UpdateStatusParams,
  RegistryTxResult,
  RegistryQueryOptions,
  RegistryRecord,
} from "./types.js";
import {
  RegistryEntryNotFoundError,
  AlreadyRegisteredError,
  RegistryEntryDeregisteredError,
} from "./errors.js";

let _idCounter = 1;

function nextId(): string {
  return String(_idCounter++);
}

function fakeTxHash(): string {
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `0x${"0".repeat(56)}${hex}`;
}

function nowIso() {
  return epochToIso(Date.now());
}

/** Mock in-memory registry that satisfies both agent-registry and service-registry ports */
export class MockRegistry {
  private readonly _agents: Map<string, AgentRegistration> = new Map();
  private readonly _services: Map<string, ServiceRegistration> = new Map();
  private _block: bigint = 1000n;

  private _nextBlock(): bigint {
    this._block += 1n;
    return this._block;
  }

  /** Register an agent and return a simulated tx result */
  async registerAgent(
    params: RegisterAgentParams
  ): Promise<Result<RegistryTxResult>> {
    const existing = [...this._agents.values()].find(
      (a) => a.walletAddress === params.walletAddress
    );
    if (existing) {
      return err(new AlreadyRegisteredError(String(params.walletAddress)));
    }

    const registryId = nextId();
    const blockNumber = this._nextBlock();
    const txHash = fakeTxHash();
    const now = nowIso();

    const record: AgentRegistration = {
      kind: "agent",
      registryId,
      walletAddress: params.walletAddress,
      metadataCid: params.metadataCid,
      status: "active",
      registeredAt: now,
      updatedAt: now,
      blockNumber,
      txHash,
    };

    this._agents.set(registryId, record);
    return ok({ txHash, blockNumber, registryId });
  }

  /** Register a service and return a simulated tx result */
  async registerService(
    params: RegisterServiceParams
  ): Promise<Result<RegistryTxResult>> {
    const existing = [...this._services.values()].find(
      (s) => s.serviceSlug === params.serviceSlug
    );
    if (existing) {
      return err(new AlreadyRegisteredError(params.serviceSlug));
    }

    const registryId = nextId();
    const blockNumber = this._nextBlock();
    const txHash = fakeTxHash();
    const now = nowIso();

    const record: ServiceRegistration = {
      kind: "service",
      registryId,
      ownerAddress: params.ownerAddress,
      serviceSlug: params.serviceSlug,
      metadataCid: params.metadataCid,
      status: "active",
      registeredAt: now,
      updatedAt: now,
      blockNumber,
      txHash,
    };

    this._services.set(registryId, record);
    return ok({ txHash, blockNumber, registryId });
  }

  /** Update the status of a registry entry (agent or service) */
  async updateStatus(
    params: UpdateStatusParams
  ): Promise<Result<RegistryTxResult>> {
    const agent = this._agents.get(params.registryId);
    if (agent) {
      if (agent.status === "deregistered") {
        return err(new RegistryEntryDeregisteredError(params.registryId));
      }
      const blockNumber = this._nextBlock();
      const txHash = fakeTxHash();
      const updated: AgentRegistration = {
        ...agent,
        status: params.status,
        updatedAt: nowIso(),
        blockNumber,
        txHash,
      };
      this._agents.set(params.registryId, updated);
      return ok({ txHash, blockNumber, registryId: params.registryId });
    }

    const service = this._services.get(params.registryId);
    if (service) {
      if (service.status === "deregistered") {
        return err(new RegistryEntryDeregisteredError(params.registryId));
      }
      const blockNumber = this._nextBlock();
      const txHash = fakeTxHash();
      const updated: ServiceRegistration = {
        ...service,
        status: params.status,
        updatedAt: nowIso(),
        blockNumber,
        txHash,
      };
      this._services.set(params.registryId, updated);
      return ok({ txHash, blockNumber, registryId: params.registryId });
    }

    return err(new RegistryEntryNotFoundError(params.registryId));
  }

  /** Read a single registry record by ID */
  async getRecord(
    registryId: string
  ): Promise<Result<RegistryRecord>> {
    const agent = this._agents.get(registryId);
    if (agent) return ok(agent);
    const service = this._services.get(registryId);
    if (service) return ok(service);
    return err(new RegistryEntryNotFoundError(registryId));
  }

  /** Query registry records with optional filters */
  async queryRecords(
    options: RegistryQueryOptions = {}
  ): Promise<Result<readonly RegistryRecord[]>> {
    const agents: RegistryRecord[] = options.kind === "service"
      ? []
      : [...this._agents.values()];

    const services: RegistryRecord[] = options.kind === "agent"
      ? []
      : [...this._services.values()];

    let records: RegistryRecord[] = [...agents, ...services];

    if (options.status) {
      records = records.filter((r) => r.status === options.status);
    }

    if (options.walletAddress) {
      const addr = String(options.walletAddress).toLowerCase();
      records = records.filter((r) => {
        if (r.kind === "agent") return String(r.walletAddress).toLowerCase() === addr;
        if (r.kind === "service") return String(r.ownerAddress).toLowerCase() === addr;
        return false;
      });
    }

    const offset = options.offset ?? 0;
    const limit = options.limit ?? records.length;
    return ok(records.slice(offset, offset + limit));
  }

  /** Return current simulated block number */
  currentBlock(): bigint {
    return this._block;
  }

  /** Reset internal state (useful in tests) */
  reset(): void {
    this._agents.clear();
    this._services.clear();
    this._block = 1000n;
  }
}
