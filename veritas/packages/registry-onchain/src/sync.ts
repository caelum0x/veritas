// Sync on-chain registry state to local in-memory store by polling a provider

import { ok, err, isOk, epochToIso, type Result, type Logger, noopLogger } from "@veritas/core";
import type { Provider } from "@veritas/blockchain";
import { MockRegistry } from "./mock-registry.js";
import {
  makeAgentRegisteredEvent,
  makeServiceRegisteredEvent,
  makeRegistrySyncedEvent,
  type RegistryEvent,
} from "./events.js";
import { RegistrySyncError } from "./errors.js";
import type { RegistryRecord } from "./types.js";

/** Callback invoked for each registry event discovered during sync */
export type SyncEventHandler = (event: RegistryEvent) => void | Promise<void>;

/** Options for configuring a RegistrySync instance */
export interface RegistrySyncOptions {
  readonly registry: MockRegistry;
  readonly provider: Provider;
  readonly logger?: Logger;
  readonly pollIntervalMs?: number;
  readonly startBlock?: bigint;
}

/** State maintained across sync iterations */
interface SyncState {
  lastSyncedBlock: bigint;
  agentsSynced: number;
  servicesSynced: number;
}

/**
 * RegistrySync polls the provider for new blocks and simulates discovery of
 * on-chain agent/service registration events, emitting domain events to handlers.
 * The real implementation would decode contract logs; here we use the mock registry
 * as the source of truth and emit events for any records updated after lastSyncedBlock.
 */
export class RegistrySync {
  private readonly _registry: MockRegistry;
  private readonly _provider: Provider;
  private readonly _logger: Logger;
  private readonly _pollIntervalMs: number;
  private readonly _handlers: SyncEventHandler[] = [];
  private _state: SyncState;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _running = false;

  constructor(options: RegistrySyncOptions) {
    this._registry = options.registry;
    this._provider = options.provider;
    this._logger = options.logger ?? noopLogger;
    this._pollIntervalMs = options.pollIntervalMs ?? 12_000;
    this._state = {
      lastSyncedBlock: options.startBlock ?? 0n,
      agentsSynced: 0,
      servicesSynced: 0,
    };
  }

  /** Register a handler to receive registry events discovered during sync */
  onEvent(handler: SyncEventHandler): void {
    this._handlers.push(handler);
  }

  /** Start periodic sync polling */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._scheduleNext();
    this._logger.info("RegistrySync started");
  }

  /** Stop periodic sync polling */
  stop(): void {
    this._running = false;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._logger.info("RegistrySync stopped");
  }

  /** Perform a single sync pass and return a result summary */
  async syncOnce(): Promise<Result<{ agentsSynced: number; servicesSynced: number; toBlock: bigint }>> {
    let currentBlock: bigint;
    try {
      currentBlock = await this._provider.getBlockNumber();
    } catch (e) {
      return err(new RegistrySyncError(`Failed to get block number: ${String(e)}`));
    }

    if (currentBlock <= this._state.lastSyncedBlock) {
      return ok({ agentsSynced: 0, servicesSynced: 0, toBlock: currentBlock });
    }

    const fromBlock = this._state.lastSyncedBlock;
    const toBlock = currentBlock;

    // In a real implementation we'd call eth_getLogs on the registry contract.
    // Here we query the mock registry for records updated in the simulated block range.
    const recordsResult = await this._registry.queryRecords({});
    if (!isOk(recordsResult)) {
      return err(new RegistrySyncError(`Failed to query registry: ${String(recordsResult.error)}`));
    }

    let agentsSynced = 0;
    let servicesSynced = 0;

    for (const record of recordsResult.value as readonly RegistryRecord[]) {
      if (record.blockNumber <= fromBlock || record.blockNumber > toBlock) continue;

      if (record.kind === "agent") {
        const event = makeAgentRegisteredEvent({
          registryId: record.registryId,
          walletAddress: String(record.walletAddress),
          metadataCid: record.metadataCid,
          txHash: record.txHash,
          blockNumber: String(record.blockNumber),
        });
        await this._emitEvent(event);
        agentsSynced++;
      } else if (record.kind === "service") {
        const event = makeServiceRegisteredEvent({
          registryId: record.registryId,
          ownerAddress: String(record.ownerAddress),
          serviceSlug: record.serviceSlug,
          metadataCid: record.metadataCid,
          txHash: record.txHash,
          blockNumber: String(record.blockNumber),
        });
        await this._emitEvent(event);
        servicesSynced++;
      }
    }

    const syncedEvent = makeRegistrySyncedEvent({
      fromBlock: String(fromBlock),
      toBlock: String(toBlock),
      agentsSynced,
      servicesSynced,
      syncedAt: epochToIso(Date.now()),
    });
    await this._emitEvent(syncedEvent);

    this._state = {
      lastSyncedBlock: toBlock,
      agentsSynced: this._state.agentsSynced + agentsSynced,
      servicesSynced: this._state.servicesSynced + servicesSynced,
    };

    this._logger.info("Registry sync pass complete", {
      fromBlock: String(fromBlock),
      toBlock: String(toBlock),
      agentsSynced,
      servicesSynced,
    } as Record<string, unknown>);

    return ok({ agentsSynced, servicesSynced, toBlock });
  }

  /** Return cumulative sync statistics */
  stats(): Readonly<SyncState> {
    return { ...this._state };
  }

  private _scheduleNext(): void {
    if (!this._running) return;
    this._timer = setTimeout(async () => {
      try {
        await this.syncOnce();
      } catch (e) {
        this._logger.error("RegistrySync error during poll", { err: String(e) } as Record<string, unknown>);
      }
      this._scheduleNext();
    }, this._pollIntervalMs);
  }

  private async _emitEvent(event: RegistryEvent): Promise<void> {
    for (const handler of this._handlers) {
      await handler(event);
    }
  }
}
