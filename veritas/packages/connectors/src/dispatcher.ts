// Dispatcher: fan-out DomainEvents to all registered connectors via mapped payloads.
import { isErr, type DomainEvent, type Logger, noopLogger } from "@veritas/core";
import type { ConnectorRegistry } from "./registry.js";
import { mapEventToPayload, type MappingOptions } from "./mapping.js";

export interface DispatcherOptions {
  readonly registry: ConnectorRegistry;
  readonly mappingOptions?: MappingOptions;
  readonly logger?: Logger;
  /** Max concurrent connector sends per event; default 8. */
  readonly concurrency?: number;
}

export interface DispatchResult {
  readonly connectorId: string;
  readonly success: boolean;
  readonly error?: unknown;
}

export class Dispatcher {
  private readonly registry: ConnectorRegistry;
  private readonly mappingOptions: MappingOptions;
  private readonly logger: Logger;
  private readonly concurrency: number;

  constructor(opts: DispatcherOptions) {
    this.registry = opts.registry;
    this.mappingOptions = opts.mappingOptions ?? {};
    this.logger = opts.logger ?? noopLogger;
    this.concurrency = opts.concurrency ?? 8;
  }

  async dispatch(event: DomainEvent): Promise<readonly DispatchResult[]> {
    const connectors = this.registry.list();
    if (connectors.length === 0) return [];

    const payload = mapEventToPayload(event, this.mappingOptions);
    const semaphore = this.concurrency;
    const results: DispatchResult[] = [];
    const queue = [...connectors];

    const runBatch = async (batch: typeof connectors): Promise<void> => {
      await Promise.all(
        batch.map(async (connector) => {
          const result = await connector.send(payload);
          if (isErr(result)) {
            this.logger.warn(
              "Connector send failed",
              { connectorId: connector.meta.id, eventType: event.type, error: result.error },
            );
            results.push({ connectorId: connector.meta.id, success: false, error: result.error });
          } else {
            results.push({ connectorId: connector.meta.id, success: true });
          }
        }),
      );
    };

    for (let i = 0; i < queue.length; i += semaphore) {
      await runBatch(queue.slice(i, i + semaphore));
    }

    return results;
  }
}
